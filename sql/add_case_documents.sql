-- Case Documents Table for Document Repository
-- Run this in Supabase SQL Editor

-- Create enum for document categories
DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'medical_records',
        'police_reports',
        'correspondence',
        'billing_financial',
        'photographs',
        'legal_documents',
        'employment_records',
        'insurance_documents',
        'expert_reports',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create case_documents table
CREATE TABLE IF NOT EXISTS case_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File metadata
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,  -- 'pdf', 'docx', 'txt', 'jpg', 'png'
    file_size INTEGER NOT NULL,  -- Size in bytes
    storage_path TEXT NOT NULL,  -- Supabase Storage path
    
    -- Document classification
    category document_category NOT NULL DEFAULT 'other',
    description TEXT,  -- User-added description/notes
    
    -- Extracted content for AI
    extracted_text TEXT,  -- Text extracted from document for AI reference
    extraction_status TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'not_applicable'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_user_id ON case_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_category ON case_documents(category);
CREATE INDEX IF NOT EXISTS idx_case_documents_created_at ON case_documents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own documents
CREATE POLICY "Users can view own case documents"
    ON case_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own case documents"
    ON case_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own case documents"
    ON case_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own case documents"
    ON case_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_case_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS case_documents_updated_at ON case_documents;
CREATE TRIGGER case_documents_updated_at
    BEFORE UPDATE ON case_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_case_documents_updated_at();

-- Grant permissions (adjust as needed for your Supabase setup)
GRANT ALL ON case_documents TO authenticated;
GRANT USAGE ON TYPE document_category TO authenticated;

-- Create Supabase Storage bucket for case files (run in Supabase dashboard or via API)
-- Note: You'll need to create the bucket 'case-files' in Supabase Storage
-- with the following policies:
--
-- Bucket: case-files
-- Public: No (private bucket)
--
-- Storage Policies:
-- 1. Allow authenticated users to upload to their own folder:
--    INSERT policy: (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- 2. Allow authenticated users to read their own files:
--    SELECT policy: (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1])
--
-- 3. Allow authenticated users to delete their own files:
--    DELETE policy: (bucket_id = 'case-files' AND auth.uid()::text = (storage.foldername(name))[1])

