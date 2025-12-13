-- Migration: Add Complaint Sections to cases table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Add new column to store complaint sections
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS complaint_sections JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN cases.complaint_sections IS 'Array of complaint section objects with id, title, content, isExpanded, type - persists user drafts';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'complaint_sections';

