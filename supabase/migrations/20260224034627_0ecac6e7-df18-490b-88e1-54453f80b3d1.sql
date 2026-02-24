-- Canonical artists registry
CREATE TABLE public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  spotify_artist_id text UNIQUE,
  image_url text,
  genres text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast name lookups and dedup
CREATE INDEX idx_artists_name_trgm ON public.artists USING gin (name gin_trgm_ops);
CREATE UNIQUE INDEX idx_artists_name_lower ON public.artists (lower(trim(name)));

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read artists"
  ON public.artists FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert artists"
  ON public.artists FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update artists"
  ON public.artists FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete artists"
  ON public.artists FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add FK from show_artists to canonical artists (nullable for gradual backfill)
ALTER TABLE public.show_artists
  ADD COLUMN artist_id uuid REFERENCES public.artists(id);

-- Timestamp trigger
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
