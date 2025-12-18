-- Migration: Add discovery documents to cases table
-- This stores all discovery documents (Interrogatories, RFP, RFA) at the case level

-- Add discovery_documents column to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS discovery_documents JSONB DEFAULT '{}'::jsonb;

-- Structure example:
-- {
--   "interrogatories": {
--     "metadata": {
--       "propoundingParty": "defendant",
--       "respondingParty": "plaintiff",
--       "setNumber": 1,
--       "jurisdiction": "california",
--       "createdAt": "2024-01-01T00:00:00Z",
--       "updatedAt": "2024-01-01T00:00:00Z"
--     },
--     "definitions": ["Definition 1...", "Definition 2..."],
--     "categories": [
--       {
--         "id": "facts",
--         "title": "Facts",
--         "items": [
--           {
--             "id": "item_123",
--             "number": 1,
--             "content": "SPECIAL INTERROGATORY NO. 1:\nDESCRIBE how the INCIDENT occurred.",
--             "isAiGenerated": false
--           }
--         ]
--       }
--     ]
--   },
--   "rfp": {
--     "metadata": { ... },
--     "definitions": [...],
--     "categories": [...]
--   },
--   "rfa": {
--     "metadata": { ... },
--     "items": [...]
--   }
-- }

-- Add comment explaining the structure
COMMENT ON COLUMN cases.discovery_documents IS 'All discovery documents for this case: interrogatories, RFP, RFA with structured categories. Each document type contains metadata, definitions, and categorized items.';

-- No additional RLS policies needed - discovery inherits from existing cases table policies
-- which already enforce user_id isolation

-- Create index for better query performance on discovery documents
CREATE INDEX IF NOT EXISTS idx_cases_discovery_documents ON cases USING GIN (discovery_documents);

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cases' 
        AND column_name = 'discovery_documents'
    ) THEN
        RAISE NOTICE 'SUCCESS: discovery_documents column added to cases table';
    ELSE
        RAISE EXCEPTION 'FAILED: discovery_documents column was not created';
    END IF;
END $$;





