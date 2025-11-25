-- Create storage bucket for show photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('show-photos', 'show-photos', true);

-- Add photo_url column to shows table
ALTER TABLE public.shows ADD COLUMN photo_url text;

-- Create index for performance
CREATE INDEX idx_shows_photo_url ON public.shows(photo_url) WHERE photo_url IS NOT NULL;

-- Storage bucket RLS policies
CREATE POLICY "Users can upload their own show photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'show-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own show photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'show-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own show photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'show-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own show photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'show-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to show photos (since bucket is public)
CREATE POLICY "Show photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'show-photos');