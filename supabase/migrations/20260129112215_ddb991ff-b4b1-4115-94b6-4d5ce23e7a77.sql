-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Make sure anon/authenticated have the needed table privileges (but NO SELECT)
GRANT INSERT, UPDATE ON TABLE public.waitlist TO anon, authenticated;

-- Replace policies with explicit anon/authenticated targets
DROP POLICY IF EXISTS "waitlist_public_insert" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_public_update" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_update" ON public.waitlist;

CREATE POLICY "waitlist_insert"
ON public.waitlist
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "waitlist_update"
ON public.waitlist
AS PERMISSIVE
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);