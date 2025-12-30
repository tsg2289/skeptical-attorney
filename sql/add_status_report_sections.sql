-- Add status_report_sections column to cases table
-- This stores the status report sections as JSONB

ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS status_report_sections JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN cases.status_report_sections IS 'Stores status report sections as JSONB array with id, title, and content fields';










