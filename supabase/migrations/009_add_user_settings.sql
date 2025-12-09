-- ============================================
-- Add settings column to profiles table
-- ============================================

-- Add settings JSONB column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::JSONB;

-- Add target_job and target_industry columns if not exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS target_job TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS target_industry TEXT;

-- Add additional columns for interview_results table
-- to support detailed report data
ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS interviewer_scores JSONB;

ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS rank_percentile INTEGER;

ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS growth_index INTEGER;

ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS strengths TEXT[];

ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS improvements TEXT[];

ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS feedback_summary TEXT;

-- Create index for faster profile settings queries
CREATE INDEX IF NOT EXISTS profiles_settings_idx ON profiles USING GIN (settings);

-- Comment on the new columns
COMMENT ON COLUMN profiles.settings IS 'User preferences and settings stored as JSONB';
COMMENT ON COLUMN profiles.target_job IS 'User target job type for interviews';
COMMENT ON COLUMN profiles.target_industry IS 'User target industry for interviews';
COMMENT ON COLUMN interview_results.interviewer_scores IS 'Individual scores from each interviewer';
COMMENT ON COLUMN interview_results.rank_percentile IS 'User rank percentile compared to all users';
COMMENT ON COLUMN interview_results.growth_index IS 'Growth index compared to previous interview';
COMMENT ON COLUMN interview_results.strengths IS 'Array of identified strengths';
COMMENT ON COLUMN interview_results.improvements IS 'Array of areas for improvement';
COMMENT ON COLUMN interview_results.feedback_summary IS 'AI-generated summary feedback';
