-- ============================================
-- SQL Migration: Case Evidence Repository
-- ============================================
-- A system for categorizing, tagging, and valuing evidence per case
-- Supports tabs/categories, importance ratings, and custom tags
-- Run this in your Supabase SQL Editor

-- Create enum for evidence importance/value
DO $$ BEGIN
    CREATE TYPE evidence_importance AS ENUM (
        'critical',
        'very_important',
        'important',
        'relevant',
        'minor',
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for evidence status
DO $$ BEGIN
    CREATE TYPE evidence_status AS ENUM (
        'pending_review',
        'reviewed',
        'admitted',
        'excluded',
        'objected',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for evidence type
DO $$ BEGIN
    CREATE TYPE evidence_type AS ENUM (
        'document',
        'photograph',
        'video',
        'audio',
        'physical',
        'testimony',
        'expert_report',
        'medical_record',
        'financial_record',
        'correspondence',
        'contract',
        'digital',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Evidence Categories Table (Custom Tabs per Case)
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Category details
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',  -- For UI tab coloring
    icon TEXT DEFAULT 'folder',     -- Icon identifier for UI
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique category name per case
    UNIQUE(case_id, name)
);

-- ============================================
-- Main Evidence Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS case_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Evidence identification
    evidence_number TEXT,  -- User-assigned exhibit number (e.g., "Exhibit A", "P-001")
    title TEXT NOT NULL,
    description TEXT,
    
    -- Categorization
    category_id UUID REFERENCES evidence_categories(id) ON DELETE SET NULL,
    evidence_type evidence_type NOT NULL DEFAULT 'document',
    
    -- Value/Importance Assessment
    importance evidence_importance NOT NULL DEFAULT 'unknown',
    importance_notes TEXT,  -- Why is this critical/important?
    
    -- Status tracking
    status evidence_status NOT NULL DEFAULT 'pending_review',
    
    -- Evidence details
    source TEXT,              -- Where did this come from?
    date_obtained DATE,
    date_of_evidence DATE,    -- Date the evidence pertains to
    obtained_from TEXT,       -- Person/entity evidence was obtained from
    chain_of_custody TEXT,
    
    -- File/storage reference (if uploaded)
    file_path TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size BIGINT,
    storage_bucket TEXT DEFAULT 'evidence',
    
    -- Flexible metadata storage
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Custom tags (array of strings for quick filtering)
    tags TEXT[] DEFAULT '{}',
    
    -- Notes and analysis
    notes TEXT,
    legal_analysis TEXT,      -- Attorney notes on legal significance
    
    -- Linking to other items
    related_evidence_ids UUID[] DEFAULT '{}',
    related_document_ids UUID[] DEFAULT '{}',  -- Links to ai_generated_documents
    
    -- Bates numbering (for discovery)
    bates_start TEXT,
    bates_end TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Evidence Tags Table (for predefined tag management)
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_tag_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tag details
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique tag name per case
    UNIQUE(case_id, name)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Evidence categories indexes
CREATE INDEX IF NOT EXISTS idx_evidence_categories_case_id ON evidence_categories(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_categories_user_id ON evidence_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_categories_sort ON evidence_categories(case_id, sort_order);

-- Case evidence indexes
CREATE INDEX IF NOT EXISTS idx_case_evidence_case_id ON case_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_user_id ON case_evidence(user_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_category_id ON case_evidence(category_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_importance ON case_evidence(importance);
CREATE INDEX IF NOT EXISTS idx_case_evidence_status ON case_evidence(status);
CREATE INDEX IF NOT EXISTS idx_case_evidence_type ON case_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_case_evidence_created_at ON case_evidence(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_case_evidence_case_category ON case_evidence(case_id, category_id);
CREATE INDEX IF NOT EXISTS idx_case_evidence_case_importance ON case_evidence(case_id, importance);
CREATE INDEX IF NOT EXISTS idx_case_evidence_case_status ON case_evidence(case_id, status);

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_case_evidence_title_search ON case_evidence USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_case_evidence_description_search ON case_evidence USING gin(to_tsvector('english', COALESCE(description, '')));

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_case_evidence_tags ON case_evidence USING gin(tags);

-- GIN index for metadata JSONB
CREATE INDEX IF NOT EXISTS idx_case_evidence_metadata ON case_evidence USING gin(metadata);

-- Evidence tag definitions indexes
CREATE INDEX IF NOT EXISTS idx_evidence_tag_defs_case_id ON evidence_tag_definitions(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tag_defs_user_id ON evidence_tag_definitions(user_id);

-- ============================================
-- Row Level Security
-- ============================================

-- Enable RLS on all tables
ALTER TABLE evidence_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_tag_definitions ENABLE ROW LEVEL SECURITY;

-- Evidence Categories RLS Policies
CREATE POLICY "Users can view own evidence categories"
    ON evidence_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence categories"
    ON evidence_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evidence categories"
    ON evidence_categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence categories"
    ON evidence_categories FOR DELETE
    USING (auth.uid() = user_id);

-- Case Evidence RLS Policies
CREATE POLICY "Users can view own case evidence"
    ON case_evidence FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own case evidence"
    ON case_evidence FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own case evidence"
    ON case_evidence FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own case evidence"
    ON case_evidence FOR DELETE
    USING (auth.uid() = user_id);

-- Evidence Tag Definitions RLS Policies
CREATE POLICY "Users can view own evidence tag definitions"
    ON evidence_tag_definitions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence tag definitions"
    ON evidence_tag_definitions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evidence tag definitions"
    ON evidence_tag_definitions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence tag definitions"
    ON evidence_tag_definitions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

-- Evidence categories trigger
CREATE OR REPLACE FUNCTION update_evidence_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evidence_categories_updated_at ON evidence_categories;
CREATE TRIGGER evidence_categories_updated_at
    BEFORE UPDATE ON evidence_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_categories_updated_at();

-- Case evidence trigger
CREATE OR REPLACE FUNCTION update_case_evidence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS case_evidence_updated_at ON case_evidence;
CREATE TRIGGER case_evidence_updated_at
    BEFORE UPDATE ON case_evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_case_evidence_updated_at();

-- ============================================
-- Grant Permissions
-- ============================================
GRANT ALL ON evidence_categories TO authenticated;
GRANT ALL ON case_evidence TO authenticated;
GRANT ALL ON evidence_tag_definitions TO authenticated;
GRANT USAGE ON TYPE evidence_importance TO authenticated;
GRANT USAGE ON TYPE evidence_status TO authenticated;
GRANT USAGE ON TYPE evidence_type TO authenticated;

-- ============================================
-- Documentation
-- ============================================
COMMENT ON TABLE evidence_categories IS 'Custom evidence categories/tabs per case. Users can organize evidence into tabs like "Medical Records", "Photos", "Contracts", etc.';
COMMENT ON TABLE case_evidence IS 'Main evidence repository. Stores all evidence items with importance ratings, categorization, tags, and metadata. Fully isolated per case.';
COMMENT ON TABLE evidence_tag_definitions IS 'Predefined tags per case for consistent tagging across evidence items.';

COMMENT ON COLUMN case_evidence.importance IS 'User-assigned importance level: critical, very_important, important, relevant, minor, unknown';
COMMENT ON COLUMN case_evidence.importance_notes IS 'Explanation of why this evidence has its assigned importance level';
COMMENT ON COLUMN case_evidence.tags IS 'Array of tag strings for flexible filtering and organization';
COMMENT ON COLUMN case_evidence.metadata IS 'Flexible JSONB storage for additional custom fields';
COMMENT ON COLUMN case_evidence.related_evidence_ids IS 'Array of related evidence item UUIDs within the same case';
COMMENT ON COLUMN case_evidence.bates_start IS 'Starting Bates number for discovery tracking';
COMMENT ON COLUMN case_evidence.bates_end IS 'Ending Bates number for discovery tracking';

-- ============================================
-- Verify Tables Created
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence_categories'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'case_evidence'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'evidence_tag_definitions'
    ) THEN
        RAISE NOTICE 'SUCCESS: All evidence repository tables created';
    ELSE
        RAISE EXCEPTION 'FAILED: One or more evidence tables were not created';
    END IF;
END $$;

