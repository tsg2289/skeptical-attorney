-- Migration: Add Answer Sections to cases table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Add new column to store answer sections
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS answer_sections JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN cases.answer_sections IS 'Array of answer section objects with preamble, defenses array, prayer, signature - persists user drafts';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'answer_sections';












