-- ============================================
-- Migration 007: Ranking Cache Tables
-- ============================================
-- Creates tables for caching rankings to improve performance
-- Used by update-rankings Edge Function

-- ============================================
-- 1. Ranking Cache Table
-- ============================================

CREATE TABLE IF NOT EXISTS ranking_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'all',
  rank_position INT NOT NULL,
  percentile NUMERIC(5,2) NOT NULL,
  best_score NUMERIC(5,2) NOT NULL,
  avg_score NUMERIC(5,2) NOT NULL,
  interview_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_type)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ranking_cache_job_type ON ranking_cache(job_type);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_rank ON ranking_cache(job_type, rank_position);
CREATE INDEX IF NOT EXISTS idx_ranking_cache_user ON ranking_cache(user_id);

-- ============================================
-- 2. Ranking Cache Metadata Table
-- ============================================

CREATE TABLE IF NOT EXISTS ranking_cache_meta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT UNIQUE NOT NULL DEFAULT 'all',
  total_users INT NOT NULL DEFAULT 0,
  total_interviews INT NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2),
  median_score NUMERIC(5,2),
  std_dev NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. RLS Policies
-- ============================================

ALTER TABLE ranking_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_cache_meta ENABLE ROW LEVEL SECURITY;

-- Users can view rankings (public leaderboard)
CREATE POLICY "Anyone can view rankings"
  ON ranking_cache FOR SELECT
  TO authenticated
  USING (true);

-- Users can view their own ranking details
CREATE POLICY "Users can view own ranking"
  ON ranking_cache FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can modify (via Edge Function)
-- No insert/update/delete policies for regular users

-- Cache meta is readable by all authenticated users
CREATE POLICY "Anyone can view ranking stats"
  ON ranking_cache_meta FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 4. Helper Functions for Rankings
-- ============================================

-- Calculate rankings batch (called by Edge Function)
CREATE OR REPLACE FUNCTION calculate_rankings_batch(p_job_type TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  rank_position INT,
  percentile NUMERIC(5,2),
  best_score NUMERIC(5,2),
  avg_score NUMERIC(5,2),
  interview_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT
      r.user_id,
      MAX(r.overall_score) AS best_score,
      ROUND(AVG(r.overall_score), 2) AS avg_score,
      COUNT(*)::INT AS interview_count
    FROM interview_results r
    JOIN interview_sessions s ON r.session_id = s.id
    WHERE (p_job_type IS NULL OR s.job_type = p_job_type)
    GROUP BY r.user_id
  ),
  ranked AS (
    SELECT
      us.user_id,
      ROW_NUMBER() OVER (ORDER BY us.best_score DESC, us.avg_score DESC)::INT AS rank_position,
      us.best_score,
      us.avg_score,
      us.interview_count
    FROM user_scores us
  )
  SELECT
    r.user_id,
    r.rank_position,
    ROUND(((COUNT(*) OVER () - r.rank_position + 1)::NUMERIC / COUNT(*) OVER ()) * 100, 2) AS percentile,
    r.best_score,
    r.avg_score,
    r.interview_count
  FROM ranked r
  ORDER BY r.rank_position;
END;
$$;

-- Ensure ranking tables exist (called by Edge Function)
CREATE OR REPLACE FUNCTION ensure_ranking_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Tables are created by migration, this is just a check
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'ranking_cache') THEN
    RAISE EXCEPTION 'ranking_cache table does not exist';
  END IF;
END;
$$;

-- Get user's current rank
CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id UUID,
  p_job_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  rank_position INT,
  percentile NUMERIC(5,2),
  best_score NUMERIC(5,2),
  avg_score NUMERIC(5,2),
  interview_count INT,
  total_users INT,
  is_cached BOOLEAN,
  cache_age_minutes INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cache ranking_cache%ROWTYPE;
  v_meta ranking_cache_meta%ROWTYPE;
  v_total_users INT;
BEGIN
  -- Try to get from cache first
  SELECT * INTO v_cache
  FROM ranking_cache
  WHERE ranking_cache.user_id = p_user_id
    AND ranking_cache.job_type = p_job_type;

  SELECT * INTO v_meta
  FROM ranking_cache_meta
  WHERE ranking_cache_meta.job_type = p_job_type;

  IF v_cache IS NOT NULL THEN
    RETURN QUERY SELECT
      v_cache.rank_position,
      v_cache.percentile,
      v_cache.best_score,
      v_cache.avg_score,
      v_cache.interview_count,
      COALESCE(v_meta.total_users, 0),
      true,
      EXTRACT(EPOCH FROM (NOW() - v_cache.updated_at))::INT / 60;
  ELSE
    -- Calculate on the fly if not cached
    SELECT COUNT(DISTINCT r.user_id)::INT INTO v_total_users
    FROM interview_results r
    JOIN interview_sessions s ON r.session_id = s.id
    WHERE (p_job_type = 'all' OR s.job_type = p_job_type);

    RETURN QUERY
    WITH user_stats AS (
      SELECT
        r.user_id,
        MAX(r.overall_score) AS best_score,
        ROUND(AVG(r.overall_score), 2) AS avg_score,
        COUNT(*)::INT AS interview_count
      FROM interview_results r
      JOIN interview_sessions s ON r.session_id = s.id
      WHERE r.user_id = p_user_id
        AND (p_job_type = 'all' OR s.job_type = p_job_type)
      GROUP BY r.user_id
    ),
    all_users AS (
      SELECT
        r.user_id,
        MAX(r.overall_score) AS best_score
      FROM interview_results r
      JOIN interview_sessions s ON r.session_id = s.id
      WHERE (p_job_type = 'all' OR s.job_type = p_job_type)
      GROUP BY r.user_id
    ),
    ranked AS (
      SELECT
        a.user_id,
        ROW_NUMBER() OVER (ORDER BY a.best_score DESC)::INT AS rn
      FROM all_users a
    )
    SELECT
      r.rn AS rank_position,
      ROUND(((v_total_users - r.rn + 1)::NUMERIC / NULLIF(v_total_users, 0)) * 100, 2) AS percentile,
      us.best_score,
      us.avg_score,
      us.interview_count,
      v_total_users,
      false,
      0
    FROM user_stats us
    JOIN ranked r ON r.user_id = us.user_id;
  END IF;
END;
$$;

-- Get leaderboard with caching
CREATE OR REPLACE FUNCTION get_cached_leaderboard(
  p_job_type TEXT DEFAULT 'all',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  rank_position INT,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  best_score NUMERIC(5,2),
  avg_score NUMERIC(5,2),
  interview_count INT,
  percentile NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if cache is fresh (within 1 hour)
  IF EXISTS (
    SELECT 1 FROM ranking_cache_meta
    WHERE job_type = p_job_type
      AND updated_at > NOW() - INTERVAL '1 hour'
  ) THEN
    -- Return from cache
    RETURN QUERY
    SELECT
      rc.rank_position,
      rc.user_id,
      p.full_name,
      p.avatar_url,
      rc.best_score,
      rc.avg_score,
      rc.interview_count,
      rc.percentile
    FROM ranking_cache rc
    LEFT JOIN profiles p ON rc.user_id = p.id
    WHERE rc.job_type = p_job_type
    ORDER BY rc.rank_position
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Calculate fresh (fallback)
    RETURN QUERY
    SELECT * FROM get_leaderboard(
      CASE WHEN p_job_type = 'all' THEN NULL ELSE p_job_type END,
      'all',
      p_limit
    );
  END IF;
END;
$$;

-- ============================================
-- 5. Grants
-- ============================================

GRANT SELECT ON ranking_cache TO authenticated;
GRANT SELECT ON ranking_cache_meta TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_rankings_batch(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION ensure_ranking_tables() TO service_role;
GRANT EXECUTE ON FUNCTION get_user_rank(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_leaderboard(TEXT, INT, INT) TO authenticated;

-- ============================================
-- 6. Trigger to invalidate cache on new results
-- ============================================

CREATE OR REPLACE FUNCTION invalidate_ranking_cache()
RETURNS TRIGGER AS $$
DECLARE
  v_job_type TEXT;
BEGIN
  -- Get job type from session
  SELECT job_type INTO v_job_type
  FROM interview_sessions
  WHERE id = NEW.session_id;

  -- Mark cache as stale by updating timestamp to old value
  UPDATE ranking_cache_meta
  SET updated_at = NOW() - INTERVAL '2 hours'
  WHERE job_type IN ('all', v_job_type);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER invalidate_ranking_on_new_result
  AFTER INSERT ON interview_results
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_ranking_cache();

COMMENT ON TABLE ranking_cache IS 'Cached user rankings for leaderboard performance';
COMMENT ON TABLE ranking_cache_meta IS 'Metadata about ranking cache freshness and statistics';
COMMENT ON FUNCTION calculate_rankings_batch IS 'Batch calculate rankings for all users (service role only)';
COMMENT ON FUNCTION get_user_rank IS 'Get a specific user rank with cache fallback';
COMMENT ON FUNCTION get_cached_leaderboard IS 'Get leaderboard from cache with fresh calculation fallback';
