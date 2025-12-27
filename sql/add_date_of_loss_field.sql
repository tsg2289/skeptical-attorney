/* 
 * Migration: Add Date of Loss field to cases table
 * Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
 * This field tracks the date of incident/loss for the case
 */

ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS date_of_loss DATE;

COMMENT ON COLUMN cases.date_of_loss IS 'Date of loss/incident for the case';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'date_of_loss';










