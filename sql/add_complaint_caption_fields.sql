/* 
 * Migration: Add Complaint Caption fields to cases table
 * Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
 * These fields are used for the complaint caption card UI and Word document generation
 */

ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS judge_name TEXT,
ADD COLUMN IF NOT EXISTS department_number TEXT,
ADD COLUMN IF NOT EXISTS complaint_filed_date DATE,
ADD COLUMN IF NOT EXISTS include_does BOOLEAN DEFAULT true;

COMMENT ON COLUMN cases.judge_name IS 'Name of the assigned judge (without Honorable prefix)';
COMMENT ON COLUMN cases.department_number IS 'Court department number';
COMMENT ON COLUMN cases.complaint_filed_date IS 'Date the complaint was filed';
COMMENT ON COLUMN cases.include_does IS 'Whether to include DOES 1-50 in the defendants list';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('judge_name', 'department_number', 'complaint_filed_date', 'include_does');

