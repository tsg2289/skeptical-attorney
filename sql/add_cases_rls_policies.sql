-- Migration: Add Row Level Security (RLS) policies to the cases table
-- This ensures defense-in-depth security where users can ONLY access their own cases
-- Run this in your Supabase SQL Editor

-- Step 1: Enable Row Level Security on the cases table
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own cases" ON public.cases;
DROP POLICY IF EXISTS "Users can insert own cases" ON public.cases;
DROP POLICY IF EXISTS "Users can update own cases" ON public.cases;
DROP POLICY IF EXISTS "Users can delete own cases" ON public.cases;

-- Step 3: Create RLS Policies for complete user isolation

-- Policy: Users can only SELECT their own cases
CREATE POLICY "Users can view own cases"
ON public.cases
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only INSERT cases with their own user_id
CREATE POLICY "Users can insert own cases"
ON public.cases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only UPDATE their own cases
CREATE POLICY "Users can update own cases"
ON public.cases
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only DELETE their own cases
CREATE POLICY "Users can delete own cases"
ON public.cases
FOR DELETE
USING (auth.uid() = user_id);

-- Step 4: Verification query (optional - run to verify policies are active)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'cases';

-- Notes:
-- 1. RLS works in conjunction with application-level security (.eq('user_id', user.id))
-- 2. This provides defense-in-depth: even if app code has a bug, RLS prevents data leakage
-- 3. auth.uid() returns the authenticated user's ID from the Supabase auth context
-- 4. These policies apply to all database access, including direct SQL and API calls

