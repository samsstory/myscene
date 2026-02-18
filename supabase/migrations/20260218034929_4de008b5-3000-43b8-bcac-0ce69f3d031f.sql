-- Allow authenticated users to search profiles by username/full_name
-- We only expose non-sensitive fields via application queries (id, username, full_name, avatar_url)
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);