
-- Create bug-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true);

-- Authenticated users can upload screenshots
CREATE POLICY "Authenticated users can upload bug screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.uid() IS NOT NULL);

-- Anyone can view bug screenshots (needed for admin panel)
CREATE POLICY "Bug screenshots are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'bug-screenshots');

-- Admins can delete bug screenshots
CREATE POLICY "Admins can delete bug screenshots"
ON storage.objects FOR DELETE
USING (bucket_id = 'bug-screenshots' AND public.has_role(auth.uid(), 'admin'));
