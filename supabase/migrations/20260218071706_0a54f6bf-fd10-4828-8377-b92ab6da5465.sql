-- Allow authenticated users to read any show (needed for invite/compare cloning)
-- The invitee needs to read the inviter's show to clone it into their own account
CREATE POLICY "Authenticated users can read shows for invite preview"
ON public.shows
FOR SELECT
TO authenticated
USING (true);

-- Also allow invitees to read show_artists for any show (for cloning)
CREATE POLICY "Authenticated users can read show artists for invite preview"
ON public.show_artists
FOR SELECT
TO authenticated
USING (true);