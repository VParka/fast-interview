-- ============================================
-- Migration 015: Interview Questions Table
-- ============================================
-- System-level interview questions from PDF for RAG-based question injection
-- Supports hybrid search (Vector + BM25) with job category filtering

-- ============================================
-- 1. Drop existing table and recreate (clean slate)
-- ============================================

-- Drop existing objects if they exist
DROP VIEW IF EXISTS interview_questions_stats;
DROP FUNCTION IF EXISTS search_interview_questions(VECTOR(1536), TEXT, TEXT, INT, FLOAT, FLOAT, INT);
DROP FUNCTION IF EXISTS match_interview_questions(VECTOR(1536), FLOAT, INT, TEXT);
DROP TABLE IF EXISTS interview_questions CASCADE;

-- Create fresh table
CREATE TABLE interview_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_category TEXT NOT NULL,           -- 'frontend', 'backend', 'pm', 'data', 'marketing'
  question_category TEXT NOT NULL,      -- '개발경험', 'CS', 'React', '직무역량' 등
  question TEXT NOT NULL,
  source_company TEXT,                  -- 출처 기업 (optional)
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Create indices for efficient search
-- ============================================

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX interview_questions_embedding_idx
  ON interview_questions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Job category filtering index
CREATE INDEX interview_questions_job_category_idx
  ON interview_questions(job_category);

-- Question category filtering index
CREATE INDEX interview_questions_question_category_idx
  ON interview_questions(question_category);

-- Full-text search using tsvector
ALTER TABLE interview_questions
  ADD COLUMN question_tsv TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('simple', question)) STORED;

CREATE INDEX interview_questions_tsv_idx
  ON interview_questions
  USING GIN (question_tsv);

-- Composite index for job + category filtering
CREATE INDEX interview_questions_job_question_category_idx
  ON interview_questions(job_category, question_category);

-- ============================================
-- 3. Hybrid search function for interview questions
-- ============================================

CREATE OR REPLACE FUNCTION search_interview_questions(
  query_embedding VECTOR(1536),
  query_text TEXT,
  p_job_category TEXT DEFAULT NULL,
  match_count INT DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.6,
  bm25_weight FLOAT DEFAULT 0.4,
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  question_category TEXT,
  job_category TEXT,
  source_company TEXT,
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
  search_limit INT := match_count * 3;
BEGIN
  RETURN QUERY
  WITH
  -- Vector similarity search
  vector_results AS (
    SELECT
      iq.id,
      iq.question,
      iq.question_category,
      iq.job_category,
      iq.source_company,
      1 - (iq.embedding <=> query_embedding) AS v_score,
      ROW_NUMBER() OVER (ORDER BY iq.embedding <=> query_embedding) AS v_rank
    FROM interview_questions iq
    WHERE iq.embedding IS NOT NULL
      AND (p_job_category IS NULL OR iq.job_category = p_job_category)
    ORDER BY iq.embedding <=> query_embedding
    LIMIT search_limit
  ),
  -- BM25-style full-text search
  bm25_results AS (
    SELECT
      iq.id,
      iq.question,
      iq.question_category,
      iq.job_category,
      iq.source_company,
      CASE
        WHEN MAX(ts_rank_cd(iq.question_tsv, plainto_tsquery('simple', query_text))) OVER() > 0
        THEN ts_rank_cd(iq.question_tsv, plainto_tsquery('simple', query_text)) /
             NULLIF(MAX(ts_rank_cd(iq.question_tsv, plainto_tsquery('simple', query_text))) OVER(), 0)
        ELSE 0
      END AS b_score,
      ROW_NUMBER() OVER (
        ORDER BY ts_rank_cd(iq.question_tsv, plainto_tsquery('simple', query_text)) DESC
      ) AS b_rank
    FROM interview_questions iq
    WHERE iq.question_tsv @@ plainto_tsquery('simple', query_text)
      AND (p_job_category IS NULL OR iq.job_category = p_job_category)
    LIMIT search_limit
  ),
  -- Combine using Reciprocal Rank Fusion (RRF)
  combined AS (
    SELECT
      COALESCE(v.id, b.id) AS id,
      COALESCE(v.question, b.question) AS question,
      COALESCE(v.question_category, b.question_category) AS question_category,
      COALESCE(v.job_category, b.job_category) AS job_category,
      COALESCE(v.source_company, b.source_company) AS source_company,
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
    c.question,
    c.question_category,
    c.job_category,
    c.source_company,
    c.combined_score,
    c.vector_score,
    c.bm25_score
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_interview_questions(VECTOR(1536), TEXT, TEXT, INT, FLOAT, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_interview_questions(VECTOR(1536), TEXT, TEXT, INT, FLOAT, FLOAT, INT) TO anon;

-- ============================================
-- 4. Simple vector-only search function (fallback)
-- ============================================

CREATE OR REPLACE FUNCTION match_interview_questions(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  p_job_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  question_category TEXT,
  job_category TEXT,
  source_company TEXT,
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
    iq.id,
    iq.question,
    iq.question_category,
    iq.job_category,
    iq.source_company,
    (1 - (iq.embedding <=> query_embedding))::FLOAT AS similarity
  FROM interview_questions iq
  WHERE iq.embedding IS NOT NULL
    AND (p_job_category IS NULL OR iq.job_category = p_job_category)
    AND (1 - (iq.embedding <=> query_embedding)) > match_threshold
  ORDER BY iq.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_interview_questions(VECTOR(1536), FLOAT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION match_interview_questions(VECTOR(1536), FLOAT, INT, TEXT) TO anon;

-- ============================================
-- 5. Statistics view for monitoring
-- ============================================

CREATE OR REPLACE VIEW interview_questions_stats AS
SELECT
  COUNT(*) AS total_questions,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS questions_with_embedding,
  COUNT(DISTINCT job_category) AS unique_job_categories,
  COUNT(DISTINCT question_category) AS unique_question_categories,
  COALESCE(
    (SELECT json_object_agg(job_category, cnt)
     FROM (SELECT job_category, COUNT(*) AS cnt FROM interview_questions GROUP BY job_category) sub),
    '{}'::json
  ) AS questions_by_job_category
FROM interview_questions;

GRANT SELECT ON interview_questions_stats TO authenticated;

-- ============================================
-- 6. RLS Policies (read-only for all authenticated users)
-- ============================================

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- Everyone can read interview questions (system-level data)
CREATE POLICY "Interview questions are viewable by everyone"
  ON interview_questions
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Only service role can modify interview questions"
  ON interview_questions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
