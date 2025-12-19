-- Migration: Add Demand Letter Sections to cases table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Add new column to store demand letter sections
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS demand_letter_sections JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN cases.demand_letter_sections IS 'Array of demand letter section objects with id, title, content - persists user drafts';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'demand_letter_sections';












