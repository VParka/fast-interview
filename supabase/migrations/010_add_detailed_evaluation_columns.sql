-- ============================================
-- Migration: Add Detailed Evaluation Columns
-- ============================================
-- Adds category_scores and interviewer_comments columns
-- to interview_results table for rubric-based evaluation

-- Add category_scores column for 5-axis core evaluation
-- Stores scores and reasoning for each category:
-- logical_structure, job_expertise, attitude_communication, company_fit, growth_potential
ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS category_scores JSONB DEFAULT NULL;

-- Add interviewer_comments column for per-interviewer feedback
-- Stores one-line comments from each interviewer persona
ALTER TABLE interview_results
ADD COLUMN IF NOT EXISTS interviewer_comments JSONB DEFAULT NULL;

-- Add index for category_scores to support queries on specific categories
CREATE INDEX IF NOT EXISTS interview_results_category_scores_idx
ON interview_results USING GIN (category_scores);

-- Comment on columns for documentation
COMMENT ON COLUMN interview_results.category_scores IS
'5-axis core evaluation with scores (1-5) and reasoning for each category: logical_structure, job_expertise, attitude_communication, company_fit, growth_potential';

COMMENT ON COLUMN interview_results.interviewer_comments IS
'Per-interviewer one-line feedback comments: hiring_manager, hr_manager, senior_peer';
