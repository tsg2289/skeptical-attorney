-- Migration: Add Court, Plaintiffs, Defendants, and Attorneys fields to cases table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Add new columns to the cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS court TEXT,
ADD COLUMN IF NOT EXISTS plaintiffs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS defendants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attorneys JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN cases.court IS 'Full court name (e.g., Superior Court of California, County of Los Angeles)';
COMMENT ON COLUMN cases.plaintiffs IS 'Array of plaintiff party objects with id, name, type, address, phone, email';
COMMENT ON COLUMN cases.defendants IS 'Array of defendant party objects with id, name, type, address, phone, email';
COMMENT ON COLUMN cases.attorneys IS 'Array of attorney objects with id, name, side (plaintiff/defendant), firm, barNumber, address, phone, email';

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('court', 'plaintiffs', 'defendants', 'attorneys');












