-- Add is_b2b flag to show_artists to mark artists participating in B2B/B3B/vs performances
ALTER TABLE public.show_artists ADD COLUMN is_b2b boolean NOT NULL DEFAULT false;

-- Create index for efficient B2B queries (find all B2B performances, count B2B stats)
CREATE INDEX idx_show_artists_b2b ON public.show_artists (show_id) WHERE is_b2b = true;