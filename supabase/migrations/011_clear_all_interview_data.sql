-- Migration: Clear all existing interview data
-- This migration deletes all interview-related records to start fresh with new 5-axis evaluation system

-- Delete all interview results first (due to foreign key constraints)
DELETE FROM interview_results;

-- Delete all messages
DELETE FROM messages;

-- Delete all interview sessions
DELETE FROM interview_sessions;

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'All interview data has been cleared successfully';
END $$;
