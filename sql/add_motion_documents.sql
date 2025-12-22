-- ============================================
-- SQL Migration: Add Motion Documents to Cases
-- ============================================
-- Run this migration in your Supabase SQL Editor
-- Project: Sleptical Attorney
-- Date: 2024

-- Add motion_documents column to cases table
-- This stores an array of motion document objects with sections
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS motion_documents jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN cases.motion_documents IS 'Array of motion document objects. Each motion contains: id, motionType, title, sections (array of section objects), createdAt, updatedAt, status, hearingDate, hearingTime, department, reservationNumber';

-- Create index for faster queries on motion documents
CREATE INDEX IF NOT EXISTS idx_cases_motion_documents ON cases USING gin (motion_documents);

-- Example structure of a motion document:
-- {
--   "id": "motion_demurrer_1702764800000",
--   "motionType": "demurrer",
--   "title": "Demurrer",
--   "sections": [
--     {
--       "id": "1",
--       "title": "Notice of Motion",
--       "content": "...",
--       "isExpanded": true,
--       "type": "notice",
--       "citations": [
--         {
--           "id": "12345",
--           "caseName": "Smith v. Jones",
--           "citation": "123 Cal.App.4th 456",
--           "year": 2020,
--           "court": "California Court of Appeal",
--           "relevantText": "...",
--           "courtListenerId": "12345",
--           "url": "https://..."
--         }
--       ]
--     }
--   ],
--   "createdAt": "2024-01-15T10:00:00.000Z",
--   "updatedAt": "2024-01-15T10:00:00.000Z",
--   "status": "draft",
--   "hearingDate": "2024-02-15",
--   "hearingTime": "8:30",
--   "department": "1"
-- }

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'motion_documents';











