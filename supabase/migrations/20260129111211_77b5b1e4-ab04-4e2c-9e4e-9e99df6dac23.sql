-- Drop the restrictive policies
DROP POLICY IF EXISTS "waitlist_insert_policy" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_update_policy" ON public.waitlist;

-- Create PERMISSIVE policies (explicitly)
CREATE POLICY "waitlist_public_insert" 
ON public.waitlist 
AS PERMISSIVE
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "waitlist_public_update" 
ON public.waitlist 
AS PERMISSIVE
FOR UPDATE 
TO public
USING (true)
WITH CHECK (true);