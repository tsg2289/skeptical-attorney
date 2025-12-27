-- Status Reports Table for Saving Multiple Reports Per Case
-- Run this in Supabase SQL Editor

-- Create enum for report status
DO $$ BEGIN
    CREATE TYPE status_report_status AS ENUM (
        'draft',
        'finalized',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create status_reports table
CREATE TABLE IF NOT EXISTS status_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Report metadata
    report_title TEXT DEFAULT 'Status Report',
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    prepared_by TEXT,
    prepared_for TEXT,
    
    -- Report status
    status status_report_status NOT NULL DEFAULT 'draft',
    
    -- Report content (sections stored as JSONB array)
    -- Format: [{ id: string, title: string, content: string }, ...]
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Version tracking
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_status_reports_case_id ON status_reports(case_id);
CREATE INDEX IF NOT EXISTS idx_status_reports_user_id ON status_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_status_reports_status ON status_reports(status);
CREATE INDEX IF NOT EXISTS idx_status_reports_report_date ON status_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_status_reports_created_at ON status_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE status_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own status reports
CREATE POLICY "Users can view own status reports"
    ON status_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own status reports"
    ON status_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status reports"
    ON status_reports FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own status reports"
    ON status_reports FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_status_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS status_reports_updated_at ON status_reports;
CREATE TRIGGER status_reports_updated_at
    BEFORE UPDATE ON status_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_status_reports_updated_at();

-- Grant permissions
GRANT ALL ON status_reports TO authenticated;
GRANT USAGE ON TYPE status_report_status TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE status_reports IS 'Stores status reports for cases. Each case can have multiple status reports (e.g., monthly reports) with version tracking.';
COMMENT ON COLUMN status_reports.sections IS 'JSONB array of report sections with id, title, and content fields';
COMMENT ON COLUMN status_reports.version IS 'Version number for tracking revisions';


