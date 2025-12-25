-- Create billing_entries table
CREATE TABLE IF NOT EXISTS billing_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  case_name TEXT NOT NULL,
  description TEXT NOT NULL,
  hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  rate DECIMAL(10,2),
  amount DECIMAL(10,2) GENERATED ALWAYS AS (hours * COALESCE(rate, 0)) STORED,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  group_name TEXT,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_billing_entries_user_id ON billing_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_entries_case_id ON billing_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_billing_entries_billing_date ON billing_entries(billing_date);
CREATE INDEX IF NOT EXISTS idx_billing_entries_user_date ON billing_entries(user_id, billing_date);

-- Enable RLS
ALTER TABLE billing_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own entries
CREATE POLICY "Users can view own billing entries" ON billing_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billing entries" ON billing_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own billing entries" ON billing_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own billing entries" ON billing_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_entries_updated_at
  BEFORE UPDATE ON billing_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_entries_updated_at();


