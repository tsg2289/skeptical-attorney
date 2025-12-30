-- Migration: Add discovery responses to cases table
-- This stores responses to received discovery (objections + answers)
-- Date: 2024

-- Add discovery_responses column to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS discovery_responses JSONB DEFAULT '{}'::jsonb;

-- Structure:
-- {
--   "interrogatories_responses": [{
--     "id": "uuid",
--     "setNumber": 1,
--     "receivedDate": "2024-01-01",
--     "dueDate": "2024-02-01",
--     "propoundingParty": "plaintiff" | "defendant",
--     "originalDocument": {
--       "fileName": "discovery.pdf",
--       "uploadedAt": "2024-01-01T00:00:00Z",
--       "extractedText": "..."
--     },
--     "responses": [{
--       "id": "uuid",
--       "requestNumber": 1,
--       "originalRequest": "State your full legal name...",
--       "objections": ["objection_id_1", "objection_id_2"],
--       "objectionTexts": ["Full objection text 1", "Full objection text 2"],
--       "answer": "Subject to the foregoing objections...",
--       "status": "draft" | "reviewed" | "final"
--     }],
--     "metadata": {
--       "respondingParty": "defendant",
--       "verificationRequired": true,
--       "status": "draft",
--       "createdAt": "2024-01-01T00:00:00Z",
--       "updatedAt": "2024-01-01T00:00:00Z"
--     }
--   }],
--   "rfp_responses": [...],
--   "rfa_responses": [...]
-- }

COMMENT ON COLUMN cases.discovery_responses IS 
  'Discovery responses: objections and answers to received interrogatories, RFP, and RFA. Each response set contains the original document, parsed requests, and attorney responses with objections.';

-- Index for query performance
CREATE INDEX IF NOT EXISTS idx_cases_discovery_responses 
ON cases USING GIN (discovery_responses);

-- Create audit log table for SOC2 compliance
CREATE TABLE IF NOT EXISTS discovery_response_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  discovery_type TEXT NOT NULL,
  response_set_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for audit log
ALTER TABLE discovery_response_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe migration)
DROP POLICY IF EXISTS "Users can view their own audit logs" ON discovery_response_audit_log;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON discovery_response_audit_log;

CREATE POLICY "Users can view their own audit logs"
ON discovery_response_audit_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own audit logs"
ON discovery_response_audit_log FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cases' 
        AND column_name = 'discovery_responses'
    ) THEN
        RAISE NOTICE 'SUCCESS: discovery_responses column added to cases table';
    ELSE
        RAISE EXCEPTION 'FAILED: discovery_responses column was not created';
    END IF;
END $$;


