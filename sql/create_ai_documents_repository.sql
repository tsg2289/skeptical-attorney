-- ============================================
-- SQL Migration: AI Generated Documents Repository
-- ============================================
-- A unified repository for all AI-generated legal documents
-- Run this in your Supabase SQL Editor

-- Create enum for document types
DO $$ BEGIN
    CREATE TYPE ai_document_type AS ENUM (
        'demand_letter',
        'complaint',
        'answer',
        'interrogatories',
        'requests_for_production',
        'requests_for_admission',
        'motion',
        'status_report',
        'deposition_outline',
        'settlement_agreement'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for document status
DO $$ BEGIN
    CREATE TYPE ai_document_status AS ENUM (
        'draft',
        'in_progress',
        'finalized',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the ai_generated_documents table
CREATE TABLE IF NOT EXISTS ai_generated_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Document identification
    document_type ai_document_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Document content
    -- Stores the full document structure as JSONB (sections, metadata, etc.)
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Document metadata
    status ai_document_status NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Optional: link to specific sub-document (e.g., motion ID within motion_documents)
    source_reference JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    finalized_at TIMESTAMPTZ
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_docs_case_id ON ai_generated_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_ai_docs_user_id ON ai_generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_docs_type ON ai_generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_ai_docs_status ON ai_generated_documents(status);
CREATE INDEX IF NOT EXISTS idx_ai_docs_created_at ON ai_generated_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_docs_updated_at ON ai_generated_documents(updated_at DESC);

-- Composite index for common queries (user's documents by type)
CREATE INDEX IF NOT EXISTS idx_ai_docs_user_type ON ai_generated_documents(user_id, document_type);

-- Full-text search index on title
CREATE INDEX IF NOT EXISTS idx_ai_docs_title_search ON ai_generated_documents USING gin(to_tsvector('english', title));

-- Enable Row Level Security
ALTER TABLE ai_generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own documents
CREATE POLICY "Users can view own AI documents"
    ON ai_generated_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI documents"
    ON ai_generated_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI documents"
    ON ai_generated_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI documents"
    ON ai_generated_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- If status changes to finalized, set finalized_at
    IF NEW.status = 'finalized' AND (OLD.status IS NULL OR OLD.status != 'finalized') THEN
        NEW.finalized_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_docs_updated_at ON ai_generated_documents;
CREATE TRIGGER ai_docs_updated_at
    BEFORE UPDATE ON ai_generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_docs_updated_at();

-- Grant permissions
GRANT ALL ON ai_generated_documents TO authenticated;
GRANT USAGE ON TYPE ai_document_type TO authenticated;
GRANT USAGE ON TYPE ai_document_status TO authenticated;

-- Documentation
COMMENT ON TABLE ai_generated_documents IS 'Central repository for all AI-generated legal documents. Provides unified access to demand letters, complaints, answers, discovery, motions, status reports, etc.';
COMMENT ON COLUMN ai_generated_documents.content IS 'JSONB storing the complete document structure - sections, metadata, citations, etc.';
COMMENT ON COLUMN ai_generated_documents.source_reference IS 'Optional reference to source (e.g., motion ID for documents that also exist in motion_documents)';
COMMENT ON COLUMN ai_generated_documents.version IS 'Version number for tracking document revisions';

-- Verify the table was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'ai_generated_documents'
    ) THEN
        RAISE NOTICE 'SUCCESS: ai_generated_documents table created';
    ELSE
        RAISE EXCEPTION 'FAILED: ai_generated_documents table was not created';
    END IF;
END $$;

