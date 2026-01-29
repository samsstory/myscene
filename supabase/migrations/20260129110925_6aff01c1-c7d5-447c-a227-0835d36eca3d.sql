-- Drop and recreate the RLS policies as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Anyone can update their waitlist entry by id" ON public.waitlist;

-- Create as PERMISSIVE policies (the default, but being explicit)
CREATE POLICY "Anyone can join waitlist" 
ON public.waitlist 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update their waitlist entry by id" 
ON public.waitlist 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);