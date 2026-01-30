-- Fix overly permissive waitlist RLS policies
-- Remove the UPDATE policy (waitlist entries should not be modifiable after submission)
DROP POLICY IF EXISTS "waitlist_update" ON public.waitlist;

-- The INSERT policy remains but we'll rely on the application for rate limiting
-- The current INSERT policy is acceptable for a public waitlist signup

-- Add a restrictive SELECT policy - only service role can read waitlist data
-- This prevents data enumeration by anonymous users
CREATE POLICY "Only service role can read waitlist"
ON public.waitlist
FOR SELECT
USING (false);  -- Deny all SELECT for regular users, service role bypasses RLS