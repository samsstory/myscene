-- First, drop ALL existing policies on waitlist table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'waitlist' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.waitlist', pol.policyname);
    END LOOP;
END $$;

-- Recreate the INSERT policy for anon users
CREATE POLICY "waitlist_insert_policy" 
ON public.waitlist 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Recreate the UPDATE policy for anon users  
CREATE POLICY "waitlist_update_policy" 
ON public.waitlist 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);