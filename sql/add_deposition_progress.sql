-- Migration: Add progress_data column and RPC functions to existing deposition table
-- Run this if you already have the deposition table and need to add progress saving
-- Run this in Supabase SQL Editor

-- Add progress_data column if it doesn't exist
ALTER TABLE public.deposition 
ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT NULL;

-- Create index for faster progress data queries
CREATE INDEX IF NOT EXISTS idx_deposition_progress_data ON public.deposition USING GIN (progress_data);

-- ============================================================================
-- RPC Functions for Deposition Progress (with security checks)
-- ============================================================================

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS save_deposition_progress(UUID, JSONB);
DROP FUNCTION IF EXISTS get_deposition_progress_optimized(UUID);

-- Function: Save deposition progress
-- Securely saves progress data only if the user owns the case
CREATE OR REPLACE FUNCTION save_deposition_progress(
    p_deposition_id UUID,
    p_progress_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_case_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Verify the user owns the case that this deposition belongs to
    SELECT d.case_id INTO v_case_id
    FROM public.deposition d
    INNER JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = p_deposition_id
    AND c.user_id = v_user_id;
    
    IF v_case_id IS NULL THEN
        RAISE EXCEPTION 'Deposition not found or access denied';
    END IF;
    
    -- Update the progress data
    UPDATE public.deposition
    SET 
        progress_data = p_progress_data,
        updated_at = NOW()
    WHERE id = p_deposition_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error saving deposition progress: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Function: Get deposition progress (optimized)
-- Securely retrieves progress data only if the user owns the case
CREATE OR REPLACE FUNCTION get_deposition_progress_optimized(
    p_deposition_id UUID
)
RETURNS TABLE(
    deposition_id UUID,
    progress_data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Return progress only for depositions the user owns (via case ownership)
    RETURN QUERY
    SELECT 
        d.id AS deposition_id,
        d.progress_data,
        d.updated_at
    FROM public.deposition d
    INNER JOIN public.cases c ON c.id = d.case_id
    WHERE d.id = p_deposition_id
    AND c.user_id = v_user_id;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION save_deposition_progress(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deposition_progress_optimized(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Deposition progress migration completed successfully!';
    RAISE NOTICE 'The progress_data column and RPC functions have been added.';
END $$;




















