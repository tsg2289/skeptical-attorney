-- Migration: Add settlement_agreement_sections column to cases table
-- Run this in Supabase SQL Editor

-- Add settlement_agreement_sections column if it doesn't exist
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS settlement_agreement_sections JSONB DEFAULT NULL;

-- Create index for faster settlement agreement queries
CREATE INDEX IF NOT EXISTS idx_cases_settlement_agreement_sections 
ON public.cases USING GIN (settlement_agreement_sections);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Settlement agreement sections migration completed successfully!';
    RAISE NOTICE 'The settlement_agreement_sections column has been added to the cases table.';
END $$;
