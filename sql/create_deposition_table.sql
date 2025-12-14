-- Migration: Create Deposition Table linked to Cases with Row Level Security
-- This ensures depositions are properly secured with no data leakage between users
-- Run this in Supabase SQL Editor

-- Drop existing deposition table if it exists
DROP TABLE IF EXISTS public.deposition CASCADE;

-- Create the deposition table linked to cases (not matter)
CREATE TABLE public.deposition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    deponent_name VARCHAR(255) NOT NULL,
    deponent_role VARCHAR(255) NOT NULL,
    deposition_date DATE NOT NULL,
    taking_attorney VARCHAR(255),
    defending_attorney VARCHAR(255),
    court_reporter VARCHAR(255),
    -- Progress data stores the full outline state (sections, questions, notes, timer)
    progress_data JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_deposition_case_id ON public.deposition(case_id);
CREATE INDEX idx_deposition_date ON public.deposition(deposition_date);

-- Enable Row Level Security
ALTER TABLE public.deposition ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT depositions that belong to cases they own
CREATE POLICY "Users can view depositions for their own cases"
    ON public.deposition
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = deposition.case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Policy: Users can only INSERT depositions for cases they own
CREATE POLICY "Users can insert depositions for their own cases"
    ON public.deposition
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Policy: Users can only UPDATE depositions that belong to cases they own
CREATE POLICY "Users can update depositions for their own cases"
    ON public.deposition
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = deposition.case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Policy: Users can only DELETE depositions that belong to cases they own
CREATE POLICY "Users can delete depositions for their own cases"
    ON public.deposition
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = deposition.case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_deposition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deposition_updated_at_trigger
    BEFORE UPDATE ON public.deposition
    FOR EACH ROW
    EXECUTE FUNCTION update_deposition_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposition TO authenticated;

-- ============================================================================
-- RPC Functions for Deposition Progress (with security checks)
-- ============================================================================

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
