
-- Add show_type column
ALTER TABLE public.shows
ADD COLUMN show_type text NOT NULL DEFAULT 'show'
CHECK (show_type IN ('show', 'showcase', 'festival'));

-- Add event_name column for showcases and festivals
ALTER TABLE public.shows
ADD COLUMN event_name text;

-- Backfill show_type from existing artist count
UPDATE public.shows s
SET show_type = CASE
  WHEN (SELECT COUNT(*) FROM show_artists sa WHERE sa.show_id = s.id) >= 10 THEN 'festival'
  WHEN (SELECT COUNT(*) FROM show_artists sa WHERE sa.show_id = s.id) >= 2  THEN 'showcase'
  ELSE 'show'
END;
