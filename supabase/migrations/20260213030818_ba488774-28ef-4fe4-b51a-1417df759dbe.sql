
-- Create show_tags table for the tag-based moments system
CREATE TABLE public.show_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for fast lookups by show
CREATE INDEX idx_show_tags_show_id ON public.show_tags(show_id);

-- Enable RLS
ALTER TABLE public.show_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies matching show_artists pattern (join to shows.user_id)
CREATE POLICY "Users can view tags for their own shows"
ON public.show_tags FOR SELECT
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_tags.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can create tags for their own shows"
ON public.show_tags FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_tags.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update tags for their own shows"
ON public.show_tags FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_tags.show_id AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete tags for their own shows"
ON public.show_tags FOR DELETE
USING (EXISTS (
  SELECT 1 FROM shows WHERE shows.id = show_tags.show_id AND shows.user_id = auth.uid()
));
