-- ============================================
-- Migration 006: Dashboard Analytics Functions
-- ============================================
-- Complex query optimization for dashboard statistics
-- - Interview history with pagination
-- - Score trends over time
-- - Performance analytics
-- - Improved rank percentile calculation with normal distribution

-- ============================================
-- 1. Dashboard Statistics Summary Function
-- ============================================
-- Returns overall stats for user's dashboard

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  total_interviews INT,
  completed_interviews INT,
  avg_score NUMERIC(5,2),
  best_score NUMERIC(5,2),
  latest_score NUMERIC(5,2),
  total_questions_answered INT,
  avg_duration_minutes INT,
  pass_rate NUMERIC(5,2),
  current_streak INT,
  rank_percentile NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_completed INT;
  v_avg NUMERIC(5,2);
  v_best NUMERIC(5,2);
  v_latest NUMERIC(5,2);
  v_questions INT;
  v_avg_duration INT;
  v_pass_rate NUMERIC(5,2);
  v_streak INT;
  v_percentile NUMERIC(5,2);
BEGIN
  -- Total and completed interviews
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total, v_completed
  FROM interview_sessions
  WHERE user_id = p_user_id;

  -- Score statistics from results
  SELECT
    ROUND(AVG(overall_score), 2),
    MAX(overall_score),
    (SELECT overall_score FROM interview_results
     WHERE user_id = p_user_id
     ORDER BY created_at DESC LIMIT 1)
  INTO v_avg, v_best, v_latest
  FROM interview_results
  WHERE user_id = p_user_id;

  -- Total questions answered (turn count sum)
  SELECT COALESCE(SUM(turn_count), 0)
  INTO v_questions
  FROM interview_sessions
  WHERE user_id = p_user_id AND status = 'completed';

  -- Average duration in minutes
  SELECT COALESCE(
    ROUND(AVG(
      EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
    ))::INT, 0)
  INTO v_avg_duration
  FROM interview_sessions
  WHERE user_id = p_user_id AND status = 'completed';

  -- Pass rate
  SELECT CASE
    WHEN COUNT(*) > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE pass_status = 'pass')::NUMERIC / COUNT(*)) * 100, 2)
    ELSE 0
  END
  INTO v_pass_rate
  FROM interview_results
  WHERE user_id = p_user_id;

  -- Current streak (consecutive days with interviews)
  WITH interview_dates AS (
    SELECT DISTINCT DATE(created_at) as interview_date
    FROM interview_sessions
    WHERE user_id = p_user_id AND status = 'completed'
    ORDER BY interview_date DESC
  ),
  streak_calc AS (
    SELECT
      interview_date,
      interview_date - (ROW_NUMBER() OVER (ORDER BY interview_date DESC))::INT AS grp
    FROM interview_dates
  )
  SELECT COALESCE(COUNT(*), 0)
  INTO v_streak
  FROM streak_calc
  WHERE grp = (SELECT grp FROM streak_calc LIMIT 1);

  -- Rank percentile (using existing function or calculate)
  SELECT COALESCE(
    (SELECT rank_percentile FROM interview_results
     WHERE user_id = p_user_id
     ORDER BY created_at DESC LIMIT 1),
    50.00
  ) INTO v_percentile;

  RETURN QUERY SELECT
    v_total, v_completed, v_avg, v_best, v_latest,
    v_questions, v_avg_duration, v_pass_rate, v_streak, v_percentile;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;

-- ============================================
-- 2. Interview History with Pagination
-- ============================================

CREATE OR REPLACE FUNCTION get_interview_history(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_id UUID,
  job_type TEXT,
  industry TEXT,
  difficulty TEXT,
  status TEXT,
  turn_count INT,
  overall_score NUMERIC(5,2),
  pass_status TEXT,
  duration_minutes INT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS session_id,
    s.job_type,
    s.industry,
    s.difficulty::TEXT,
    s.status::TEXT,
    s.turn_count,
    r.overall_score,
    r.pass_status::TEXT,
    EXTRACT(EPOCH FROM (s.updated_at - s.created_at))::INT / 60 AS duration_minutes,
    s.created_at,
    CASE WHEN s.status = 'completed' THEN s.updated_at ELSE NULL END AS completed_at
  FROM interview_sessions s
  LEFT JOIN interview_results r ON s.id = r.session_id
  WHERE s.user_id = p_user_id
    AND (p_status IS NULL OR s.status::TEXT = p_status)
    AND (p_job_type IS NULL OR s.job_type = p_job_type)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_interview_history(UUID, INT, INT, TEXT, TEXT) TO authenticated;

-- ============================================
-- 3. Score Trend Analysis
-- ============================================

CREATE OR REPLACE FUNCTION get_score_trends(
  p_user_id UUID,
  p_days INT DEFAULT 30,
  p_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  avg_score NUMERIC(5,2),
  min_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  interview_count INT,
  avg_competency_behavioral NUMERIC(5,2),
  avg_competency_clarity NUMERIC(5,2),
  avg_competency_comprehension NUMERIC(5,2),
  avg_competency_communication NUMERIC(5,2),
  avg_competency_reasoning NUMERIC(5,2),
  avg_competency_problem_solving NUMERIC(5,2),
  avg_competency_leadership NUMERIC(5,2),
  avg_competency_adaptability NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(r.created_at) AS date,
    ROUND(AVG(r.overall_score), 2) AS avg_score,
    MIN(r.overall_score) AS min_score,
    MAX(r.overall_score) AS max_score,
    COUNT(*)::INT AS interview_count,
    ROUND(AVG((r.competency_scores->>'behavioral')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'clarity')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'comprehension')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'communication')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'reasoning')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'problem_solving')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'leadership')::NUMERIC), 2),
    ROUND(AVG((r.competency_scores->>'adaptability')::NUMERIC), 2)
  FROM interview_results r
  JOIN interview_sessions s ON r.session_id = s.id
  WHERE r.user_id = p_user_id
    AND r.created_at >= CURRENT_DATE - p_days
    AND (p_job_type IS NULL OR s.job_type = p_job_type)
  GROUP BY DATE(r.created_at)
  ORDER BY date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_score_trends(UUID, INT, TEXT) TO authenticated;

-- ============================================
-- 4. Competency Comparison (User vs Average)
-- ============================================

CREATE OR REPLACE FUNCTION get_competency_comparison(
  p_user_id UUID,
  p_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  competency TEXT,
  user_avg NUMERIC(5,2),
  global_avg NUMERIC(5,2),
  percentile NUMERIC(5,2),
  trend TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  competencies TEXT[] := ARRAY['behavioral', 'clarity', 'comprehension', 'communication', 'reasoning', 'problem_solving', 'leadership', 'adaptability'];
  comp TEXT;
  v_user_avg NUMERIC(5,2);
  v_global_avg NUMERIC(5,2);
  v_percentile NUMERIC(5,2);
  v_trend TEXT;
  v_recent_score NUMERIC(5,2);
  v_prev_score NUMERIC(5,2);
BEGIN
  FOREACH comp IN ARRAY competencies LOOP
    -- User's average for this competency
    SELECT ROUND(AVG((r.competency_scores->>comp)::NUMERIC), 2)
    INTO v_user_avg
    FROM interview_results r
    JOIN interview_sessions s ON r.session_id = s.id
    WHERE r.user_id = p_user_id
      AND (p_job_type IS NULL OR s.job_type = p_job_type);

    -- Global average for this competency
    SELECT ROUND(AVG((r.competency_scores->>comp)::NUMERIC), 2)
    INTO v_global_avg
    FROM interview_results r
    JOIN interview_sessions s ON r.session_id = s.id
    WHERE (p_job_type IS NULL OR s.job_type = p_job_type);

    -- Calculate percentile
    SELECT ROUND(
      (COUNT(*) FILTER (WHERE (r.competency_scores->>comp)::NUMERIC < COALESCE(v_user_avg, 0))::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100, 2)
    INTO v_percentile
    FROM interview_results r
    JOIN interview_sessions s ON r.session_id = s.id
    WHERE (p_job_type IS NULL OR s.job_type = p_job_type);

    -- Calculate trend (comparing recent vs previous)
    SELECT (r.competency_scores->>comp)::NUMERIC
    INTO v_recent_score
    FROM interview_results r
    WHERE r.user_id = p_user_id
    ORDER BY r.created_at DESC LIMIT 1;

    SELECT (r.competency_scores->>comp)::NUMERIC
    INTO v_prev_score
    FROM interview_results r
    WHERE r.user_id = p_user_id
    ORDER BY r.created_at DESC LIMIT 1 OFFSET 1;

    IF v_recent_score IS NULL OR v_prev_score IS NULL THEN
      v_trend := 'neutral';
    ELSIF v_recent_score > v_prev_score THEN
      v_trend := 'up';
    ELSIF v_recent_score < v_prev_score THEN
      v_trend := 'down';
    ELSE
      v_trend := 'neutral';
    END IF;

    competency := comp;
    user_avg := COALESCE(v_user_avg, 0);
    global_avg := COALESCE(v_global_avg, 0);
    percentile := COALESCE(v_percentile, 50);
    trend := v_trend;

    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION get_competency_comparison(UUID, TEXT) TO authenticated;

-- ============================================
-- 5. Enhanced Rank Percentile with Normal Distribution
-- ============================================
-- Replaces the basic percentile function with Z-score calculation

CREATE OR REPLACE FUNCTION get_user_rank_percentile_enhanced(
  p_user_id UUID,
  p_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_score NUMERIC(5,2),
  mean_score NUMERIC(5,2),
  std_dev NUMERIC(5,2),
  z_score NUMERIC(5,2),
  percentile NUMERIC(5,2),
  rank_position INT,
  total_users INT,
  comparison_text TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_score NUMERIC(5,2);
  v_mean NUMERIC(5,2);
  v_stddev NUMERIC(5,2);
  v_zscore NUMERIC(5,2);
  v_percentile NUMERIC(5,2);
  v_rank INT;
  v_total INT;
  v_comparison TEXT;
BEGIN
  -- Get user's latest score
  SELECT r.overall_score INTO v_user_score
  FROM interview_results r
  JOIN interview_sessions s ON r.session_id = s.id
  WHERE r.user_id = p_user_id
    AND (p_job_type IS NULL OR s.job_type = p_job_type)
  ORDER BY r.created_at DESC
  LIMIT 1;

  IF v_user_score IS NULL THEN
    RETURN;
  END IF;

  -- Calculate mean and standard deviation
  SELECT
    ROUND(AVG(r.overall_score), 2),
    ROUND(STDDEV_POP(r.overall_score), 2)
  INTO v_mean, v_stddev
  FROM interview_results r
  JOIN interview_sessions s ON r.session_id = s.id
  WHERE (p_job_type IS NULL OR s.job_type = p_job_type);

  -- Calculate Z-score
  IF v_stddev > 0 THEN
    v_zscore := ROUND((v_user_score - v_mean) / v_stddev, 2);
  ELSE
    v_zscore := 0;
  END IF;

  -- Convert Z-score to percentile using normal CDF approximation
  -- Using Abramowitz and Stegun approximation
  v_percentile := ROUND(
    100 * (0.5 * (1 + SIGN(v_zscore) * SQRT(1 - EXP(-2 * v_zscore * v_zscore / 3.14159265)))),
    2
  );

  -- Clamp percentile between 0.01 and 99.99
  v_percentile := GREATEST(0.01, LEAST(99.99, v_percentile));

  -- Calculate rank position
  SELECT COUNT(DISTINCT r.user_id)
  INTO v_rank
  FROM interview_results r
  JOIN interview_sessions s ON r.session_id = s.id
  WHERE (p_job_type IS NULL OR s.job_type = p_job_type)
    AND r.overall_score > v_user_score;
  v_rank := v_rank + 1;

  -- Total users
  SELECT COUNT(DISTINCT r.user_id)
  INTO v_total
  FROM interview_results r
  JOIN interview_sessions s ON r.session_id = s.id
  WHERE (p_job_type IS NULL OR s.job_type = p_job_type);

  -- Generate comparison text
  IF v_percentile >= 90 THEN
    v_comparison := '상위 10% 이내의 탁월한 성적입니다!';
  ELSIF v_percentile >= 75 THEN
    v_comparison := '상위 25% 이내의 우수한 성적입니다.';
  ELSIF v_percentile >= 50 THEN
    v_comparison := '평균 이상의 준수한 성적입니다.';
  ELSIF v_percentile >= 25 THEN
    v_comparison := '평균 수준입니다. 조금 더 노력해보세요.';
  ELSE
    v_comparison := '더 많은 연습이 필요합니다. 화이팅!';
  END IF;

  RETURN QUERY SELECT
    v_user_score, v_mean, COALESCE(v_stddev, 0), v_zscore,
    v_percentile, v_rank, v_total, v_comparison;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_rank_percentile_enhanced(UUID, TEXT) TO authenticated;

-- ============================================
-- 6. Optimized Interview Results with Full Details
-- ============================================

CREATE OR REPLACE FUNCTION get_interview_result_details(
  p_session_id UUID
)
RETURNS TABLE (
  result_id UUID,
  session_id UUID,
  user_id UUID,
  job_type TEXT,
  industry TEXT,
  difficulty TEXT,
  overall_score NUMERIC(5,2),
  pass_status TEXT,
  interviewer_scores JSONB,
  competency_scores JSONB,
  rank_percentile NUMERIC(5,2),
  feedback_summary TEXT,
  strengths TEXT[],
  improvements TEXT[],
  turn_count INT,
  duration_minutes INT,
  messages_count INT,
  session_created_at TIMESTAMPTZ,
  result_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS result_id,
    s.id AS session_id,
    r.user_id,
    s.job_type,
    s.industry,
    s.difficulty::TEXT,
    r.overall_score,
    r.pass_status::TEXT,
    r.interviewer_scores,
    r.competency_scores,
    r.rank_percentile,
    r.feedback_summary,
    r.strengths,
    r.improvements,
    s.turn_count,
    EXTRACT(EPOCH FROM (s.updated_at - s.created_at))::INT / 60 AS duration_minutes,
    (SELECT COUNT(*)::INT FROM messages WHERE messages.session_id = s.id) AS messages_count,
    s.created_at AS session_created_at,
    r.created_at AS result_created_at
  FROM interview_results r
  JOIN interview_sessions s ON r.session_id = s.id
  WHERE s.id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_interview_result_details(UUID) TO authenticated;

-- ============================================
-- 7. Leaderboard Function
-- ============================================

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_job_type TEXT DEFAULT NULL,
  p_period TEXT DEFAULT 'all', -- 'week', 'month', 'all'
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  rank_position INT,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  best_score NUMERIC(5,2),
  avg_score NUMERIC(5,2),
  interview_count INT,
  last_interview TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_filter TIMESTAMPTZ;
BEGIN
  -- Set date filter based on period
  CASE p_period
    WHEN 'week' THEN v_date_filter := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'month' THEN v_date_filter := CURRENT_DATE - INTERVAL '30 days';
    ELSE v_date_filter := '1970-01-01'::TIMESTAMPTZ;
  END CASE;

  RETURN QUERY
  WITH user_stats AS (
    SELECT
      r.user_id,
      MAX(r.overall_score) AS best_score,
      ROUND(AVG(r.overall_score), 2) AS avg_score,
      COUNT(*)::INT AS interview_count,
      MAX(r.created_at) AS last_interview
    FROM interview_results r
    JOIN interview_sessions s ON r.session_id = s.id
    WHERE r.created_at >= v_date_filter
      AND (p_job_type IS NULL OR s.job_type = p_job_type)
    GROUP BY r.user_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY us.best_score DESC, us.avg_score DESC)::INT AS rank_position,
    us.user_id,
    p.full_name,
    p.avatar_url,
    us.best_score,
    us.avg_score,
    us.interview_count,
    us.last_interview
  FROM user_stats us
  LEFT JOIN profiles p ON us.user_id = p.id
  ORDER BY us.best_score DESC, us.avg_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard(TEXT, TEXT, INT) TO authenticated;

-- ============================================
-- 8. Growth Index Calculation
-- ============================================
-- Measures improvement rate between interviews

CREATE OR REPLACE FUNCTION calculate_growth_index(p_user_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scores NUMERIC[];
  v_growth NUMERIC(5,2);
  v_count INT;
BEGIN
  -- Get last 5 scores in chronological order
  SELECT ARRAY_AGG(overall_score ORDER BY created_at ASC)
  INTO v_scores
  FROM (
    SELECT overall_score, created_at
    FROM interview_results
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 5
  ) recent;

  v_count := COALESCE(array_length(v_scores, 1), 0);

  IF v_count < 2 THEN
    RETURN 0;
  END IF;

  -- Calculate weighted growth (recent improvements weighted more)
  v_growth := 0;
  FOR i IN 2..v_count LOOP
    v_growth := v_growth + (v_scores[i] - v_scores[i-1]) * (i - 1);
  END LOOP;

  -- Normalize by weighted count
  v_growth := v_growth / ((v_count * (v_count - 1)) / 2);

  RETURN ROUND(v_growth, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_growth_index(UUID) TO authenticated;

-- ============================================
-- 9. Update interview_results with rank_percentile trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_result_rank_percentile()
RETURNS TRIGGER AS $$
DECLARE
  v_job_type TEXT;
  v_percentile NUMERIC(5,2);
BEGIN
  -- Get job type from session
  SELECT job_type INTO v_job_type
  FROM interview_sessions
  WHERE id = NEW.session_id;

  -- Calculate percentile
  SELECT percentile INTO v_percentile
  FROM get_user_rank_percentile_enhanced(NEW.user_id, v_job_type);

  -- Update the record
  NEW.rank_percentile := COALESCE(v_percentile, 50.00);
  NEW.growth_index := calculate_growth_index(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_result_percentile ON interview_results;
CREATE TRIGGER update_result_percentile
  BEFORE INSERT OR UPDATE ON interview_results
  FOR EACH ROW
  EXECUTE FUNCTION update_result_rank_percentile();

-- ============================================
-- 10. Indexes for performance optimization
-- ============================================

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_results_user_created
  ON interview_results(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_status_created
  ON interview_sessions(user_id, status, created_at DESC);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_results_score_created
  ON interview_results(overall_score DESC, created_at DESC);

-- Partial index for completed sessions only
CREATE INDEX IF NOT EXISTS idx_sessions_completed
  ON interview_sessions(user_id, created_at DESC)
  WHERE status = 'completed';

-- JSONB index for competency queries
CREATE INDEX IF NOT EXISTS idx_results_competency_scores
  ON interview_results USING GIN (competency_scores);

COMMENT ON FUNCTION get_dashboard_stats IS 'Returns comprehensive dashboard statistics for a user';
COMMENT ON FUNCTION get_interview_history IS 'Returns paginated interview history with filtering';
COMMENT ON FUNCTION get_score_trends IS 'Returns daily score trends with competency breakdown';
COMMENT ON FUNCTION get_competency_comparison IS 'Compares user competency scores against global averages';
COMMENT ON FUNCTION get_user_rank_percentile_enhanced IS 'Calculates rank percentile using normal distribution (Z-score)';
COMMENT ON FUNCTION get_interview_result_details IS 'Returns complete interview result with session details';
COMMENT ON FUNCTION get_leaderboard IS 'Returns leaderboard rankings with filtering by job type and time period';
COMMENT ON FUNCTION calculate_growth_index IS 'Calculates weighted growth index based on recent score improvements';
