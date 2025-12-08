-- ============================================
-- Migration 005: Hybrid Search Optimization
-- ============================================
-- Optimizes hybrid_search() function for performance and security
-- Adds user_id filtering, improved BM25 normalization, and better index configuration

-- ============================================
-- 1. Drop and recreate optimized hybrid_search function
-- ============================================

DROP FUNCTION IF EXISTS hybrid_search(VECTOR(1536), TEXT, INT, FLOAT, FLOAT);

-- Optimized hybrid search with user filtering and RRF (Reciprocal Rank Fusion)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_count INT,
  p_user_id UUID DEFAULT NULL,
  vector_weight FLOAT DEFAULT 0.6,
  bm25_weight FLOAT DEFAULT 0.4,
  rrf_k INT DEFAULT 60  -- RRF constant (standard is 60)
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  combined_score FLOAT,
  vector_score FLOAT,
  bm25_score FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_limit INT := match_count * 3;  -- Fetch more for fusion
BEGIN
  RETURN QUERY
  WITH
  -- Vector similarity search
  vector_results AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      d.user_id,
      1 - (d.embedding <=> query_embedding) AS v_score,
      ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS v_rank
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND (p_user_id IS NULL OR d.user_id = p_user_id)
    ORDER BY d.embedding <=> query_embedding
    LIMIT search_limit
  ),
  -- BM25-style full-text search with proper normalization
  bm25_results AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      d.user_id,
      -- Normalized BM25 score (0-1 range)
      CASE
        WHEN MAX(ts_rank_cd(d.content_tsv, plainto_tsquery('simple', query_text))) OVER() > 0
        THEN ts_rank_cd(d.content_tsv, plainto_tsquery('simple', query_text)) /
             NULLIF(MAX(ts_rank_cd(d.content_tsv, plainto_tsquery('simple', query_text))) OVER(), 0)
        ELSE 0
      END AS b_score,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(d.content_tsv, plainto_tsquery('simple', query_text)) DESC
      ) AS b_rank
    FROM documents d
    WHERE d.content_tsv @@ plainto_tsquery('simple', query_text)
      AND (p_user_id IS NULL OR d.user_id = p_user_id)
    LIMIT search_limit
  ),
  -- Combine using Reciprocal Rank Fusion (RRF)
  combined AS (
    SELECT
      COALESCE(v.id, b.id) AS id,
      COALESCE(v.content, b.content) AS content,
      COALESCE(v.metadata, b.metadata) AS metadata,
      -- RRF combined score with weights
      (
        vector_weight * COALESCE(1.0 / (rrf_k + v.v_rank), 0) +
        bm25_weight * COALESCE(1.0 / (rrf_k + b.b_rank), 0)
      ) AS combined_score,
      COALESCE(v.v_score, 0)::FLOAT AS vector_score,
      COALESCE(b.b_score, 0)::FLOAT AS bm25_score
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.id = b.id
  )
  SELECT
    c.id,
    c.content,
    c.metadata,
    c.combined_score,
    c.vector_score,
    c.bm25_score
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION hybrid_search(VECTOR(1536), TEXT, INT, UUID, FLOAT, FLOAT, INT) TO authenticated;

-- ============================================
-- 2. Create optimized match_documents function with user filtering
-- ============================================

DROP FUNCTION IF EXISTS match_documents(VECTOR(1536), FLOAT, INT);

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity
  FROM documents d
  WHERE d.embedding IS NOT NULL
    AND (p_user_id IS NULL OR d.user_id = p_user_id)
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_documents(VECTOR(1536), FLOAT, INT, UUID) TO authenticated;

-- ============================================
-- 3. Add composite indexes for better query performance
-- ============================================

-- Index for user-specific document queries with vector search
CREATE INDEX IF NOT EXISTS documents_user_embedding_idx
  ON documents(user_id)
  WHERE embedding IS NOT NULL;

-- Index for filtering by document type
CREATE INDEX IF NOT EXISTS documents_type_idx ON documents(type);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS documents_user_type_idx ON documents(user_id, type);

-- ============================================
-- 4. Add function to dynamically calculate optimal IVFFlat lists
-- ============================================

CREATE OR REPLACE FUNCTION get_optimal_ivfflat_lists()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  row_count BIGINT;
  optimal_lists INT;
BEGIN
  SELECT COUNT(*) INTO row_count FROM documents WHERE embedding IS NOT NULL;

  IF row_count < 1000 THEN
    optimal_lists := 10;  -- Minimum for small datasets
  ELSIF row_count < 10000 THEN
    optimal_lists := GREATEST(10, SQRT(row_count)::INT);
  ELSIF row_count < 1000000 THEN
    optimal_lists := SQRT(row_count)::INT;
  ELSE
    optimal_lists := (row_count / 1000)::INT;
  END IF;

  RETURN optimal_lists;
END;
$$;

-- ============================================
-- 5. Add statistics view for monitoring
-- ============================================

CREATE OR REPLACE VIEW documents_stats AS
SELECT
  COUNT(*) AS total_documents,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS documents_with_embedding,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) FILTER (WHERE type = 'resume') AS resume_count,
  COUNT(*) FILTER (WHERE type = 'portfolio') AS portfolio_count,
  get_optimal_ivfflat_lists() AS recommended_ivf_lists,
  pg_size_pretty(pg_total_relation_size('documents')) AS table_size
FROM documents;

GRANT SELECT ON documents_stats TO authenticated;
