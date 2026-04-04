-- PHASE 0: SECURITY HARDENING
-- Run this in Supabase SQL Editor IMMEDIATELY
-- Locks down governance-bearing tables

-- 1. Remove dangerous anon insert policies on governance tables
DROP POLICY IF EXISTS "Anon insert proposals" ON proposals;
DROP POLICY IF EXISTS "Anon insert witness_actions" ON witness_actions;

-- 2. Remove dangerous anon update policies
DROP POLICY IF EXISTS "Anon update proposals" ON proposals;

-- 3. Keep anon insert on lower-risk tables (trails, annotations, session_objects)
-- These are user-facing features, not governance-bearing

-- 4. Add attribution tracking
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE witness_actions ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE witness_actions ADD COLUMN IF NOT EXISTS signature TEXT;

-- 5. Create service-role-only insert policies for governance tables
-- (These require the service_role key, not the anon key)
CREATE POLICY "Service role insert proposals" ON proposals 
  FOR INSERT WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role insert witness_actions" ON witness_actions 
  FOR INSERT WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- 6. Service-role-only update on proposals (for vote recording)
CREATE POLICY "Service role update proposals" ON proposals 
  FOR UPDATE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Verify
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
