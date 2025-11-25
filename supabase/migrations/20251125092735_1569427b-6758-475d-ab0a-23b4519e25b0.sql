-- Allow authenticated users to insert venues
CREATE POLICY "Users can insert venues"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);