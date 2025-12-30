-- =====================================================
-- LITIGATION PLANNING TABLES
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to create
-- the litigation planning tables for database persistence
-- =====================================================

-- =====================================================
-- 1. LITIGATION PLANNING SETTINGS TABLE
-- Stores trial dates, expert exchange dates, and settings per case
-- =====================================================
CREATE TABLE IF NOT EXISTS litigation_planning_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trial_date DATE,
    expert_exchange_date DATE,
    trial_set_date DATE,
    ocsc_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One settings record per case
    UNIQUE(case_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_litigation_planning_settings_case_id 
    ON litigation_planning_settings(case_id);
CREATE INDEX IF NOT EXISTS idx_litigation_planning_settings_user_id 
    ON litigation_planning_settings(user_id);

-- =====================================================
-- 2. LITIGATION PLANNING DEADLINES TABLE
-- Stores both auto-generated and custom deadlines
-- =====================================================
CREATE TABLE IF NOT EXISTS litigation_planning_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Deadline details
    title TEXT NOT NULL,
    deadline_date DATE NOT NULL,
    rule_reference TEXT,  -- e.g., "CCP §437c", "30 days before trial"
    category TEXT NOT NULL CHECK (category IN ('pleadings', 'discovery', 'motions', 'trial')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('auto-deadline', 'manual')),
    
    -- Status
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- For auto-generated deadlines, store the rule ID for reference
    rule_id TEXT,  -- e.g., 'discovery-cutoff', 'summary-judgment-mail'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_litigation_planning_deadlines_case_id 
    ON litigation_planning_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_litigation_planning_deadlines_user_id 
    ON litigation_planning_deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_litigation_planning_deadlines_date 
    ON litigation_planning_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_litigation_planning_deadlines_category 
    ON litigation_planning_deadlines(category);
CREATE INDEX IF NOT EXISTS idx_litigation_planning_deadlines_source 
    ON litigation_planning_deadlines(source);

-- =====================================================
-- 3. LITIGATION PLANNING CHECKLIST TABLE
-- Stores completion status for pleadings, discovery, motions checklists
-- =====================================================
CREATE TABLE IF NOT EXISTS litigation_planning_checklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Checklist item reference
    item_id TEXT NOT NULL,  -- e.g., 'complaint', 'answer', 'form-interrogatories'
    section TEXT NOT NULL,  -- e.g., 'pleadings-initial', 'discovery-written', 'motions-dispositive'
    
    -- Status
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One record per checklist item per case
    UNIQUE(case_id, item_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_litigation_planning_checklist_case_id 
    ON litigation_planning_checklist(case_id);
CREATE INDEX IF NOT EXISTS idx_litigation_planning_checklist_user_id 
    ON litigation_planning_checklist(user_id);

-- =====================================================
-- 4. UPDATE TRIGGERS
-- Automatically update the updated_at timestamp
-- =====================================================

-- Settings update trigger
CREATE OR REPLACE FUNCTION update_litigation_planning_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_litigation_planning_settings_updated_at 
    ON litigation_planning_settings;
CREATE TRIGGER trigger_update_litigation_planning_settings_updated_at
    BEFORE UPDATE ON litigation_planning_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_litigation_planning_settings_updated_at();

-- Deadlines update trigger
CREATE OR REPLACE FUNCTION update_litigation_planning_deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Set completed_at when marked as completed
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = NOW();
    ELSIF NEW.completed = false THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_litigation_planning_deadlines_updated_at 
    ON litigation_planning_deadlines;
CREATE TRIGGER trigger_update_litigation_planning_deadlines_updated_at
    BEFORE UPDATE ON litigation_planning_deadlines
    FOR EACH ROW
    EXECUTE FUNCTION update_litigation_planning_deadlines_updated_at();

-- Checklist update trigger
CREATE OR REPLACE FUNCTION update_litigation_planning_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Set completed_at when marked as completed
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = NOW();
    ELSIF NEW.completed = false THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_litigation_planning_checklist_updated_at 
    ON litigation_planning_checklist;
CREATE TRIGGER trigger_update_litigation_planning_checklist_updated_at
    BEFORE UPDATE ON litigation_planning_checklist
    FOR EACH ROW
    EXECUTE FUNCTION update_litigation_planning_checklist_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure users can only access their own data
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE litigation_planning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE litigation_planning_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE litigation_planning_checklist ENABLE ROW LEVEL SECURITY;

-- Settings policies
DROP POLICY IF EXISTS "Users can view their own settings" ON litigation_planning_settings;
CREATE POLICY "Users can view their own settings" ON litigation_planning_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON litigation_planning_settings;
CREATE POLICY "Users can insert their own settings" ON litigation_planning_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON litigation_planning_settings;
CREATE POLICY "Users can update their own settings" ON litigation_planning_settings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON litigation_planning_settings;
CREATE POLICY "Users can delete their own settings" ON litigation_planning_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Deadlines policies
DROP POLICY IF EXISTS "Users can view their own deadlines" ON litigation_planning_deadlines;
CREATE POLICY "Users can view their own deadlines" ON litigation_planning_deadlines
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own deadlines" ON litigation_planning_deadlines;
CREATE POLICY "Users can insert their own deadlines" ON litigation_planning_deadlines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own deadlines" ON litigation_planning_deadlines;
CREATE POLICY "Users can update their own deadlines" ON litigation_planning_deadlines
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own deadlines" ON litigation_planning_deadlines;
CREATE POLICY "Users can delete their own deadlines" ON litigation_planning_deadlines
    FOR DELETE USING (auth.uid() = user_id);

-- Checklist policies
DROP POLICY IF EXISTS "Users can view their own checklist" ON litigation_planning_checklist;
CREATE POLICY "Users can view their own checklist" ON litigation_planning_checklist
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own checklist items" ON litigation_planning_checklist;
CREATE POLICY "Users can insert their own checklist items" ON litigation_planning_checklist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own checklist items" ON litigation_planning_checklist;
CREATE POLICY "Users can update their own checklist items" ON litigation_planning_checklist
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own checklist items" ON litigation_planning_checklist;
CREATE POLICY "Users can delete their own checklist items" ON litigation_planning_checklist
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 6. HELPFUL VIEWS
-- =====================================================

-- View for upcoming deadlines across all cases
CREATE OR REPLACE VIEW upcoming_litigation_deadlines AS
SELECT 
    d.id,
    d.case_id,
    c.case_name,
    c.case_number,
    d.title,
    d.deadline_date,
    d.rule_reference,
    d.category,
    d.source,
    d.completed,
    d.user_id,
    CASE 
        WHEN d.deadline_date < CURRENT_DATE THEN 'overdue'
        WHEN d.deadline_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN d.deadline_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
        ELSE 'future'
    END AS urgency,
    d.deadline_date - CURRENT_DATE AS days_remaining
FROM litigation_planning_deadlines d
JOIN cases c ON d.case_id = c.id
WHERE d.completed = false
ORDER BY d.deadline_date ASC;

-- =====================================================
-- DONE! 
-- Run this entire script in your Supabase SQL Editor
-- =====================================================








