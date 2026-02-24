
-- Create festival_lineups reference catalog table
CREATE TABLE public.festival_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  year integer NOT NULL,
  date_start date,
  date_end date,
  venue_name text,
  venue_location text,
  venue_id uuid REFERENCES public.venues(id),
  artists jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text DEFAULT 'manual',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on normalized event_name + year
CREATE UNIQUE INDEX idx_festival_lineups_event_year
  ON public.festival_lineups (lower(trim(event_name)), year);

-- GIN index on artists JSONB for searching artist names
CREATE INDEX idx_festival_lineups_artists_gin
  ON public.festival_lineups USING GIN (artists);

-- Trigram index on event_name for fuzzy search
CREATE INDEX idx_festival_lineups_event_name_trgm
  ON public.festival_lineups USING GIN (event_name public.gin_trgm_ops);

-- Enable RLS
ALTER TABLE public.festival_lineups ENABLE ROW LEVEL SECURITY;

-- SELECT: all authenticated users
CREATE POLICY "Authenticated users can read festival lineups"
  ON public.festival_lineups FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: admins only
CREATE POLICY "Admins can insert festival lineups"
  ON public.festival_lineups FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: admins only
CREATE POLICY "Admins can update festival lineups"
  ON public.festival_lineups FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- DELETE: admins only
CREATE POLICY "Admins can delete festival lineups"
  ON public.festival_lineups FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_festival_lineups_updated_at
  BEFORE UPDATE ON public.festival_lineups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
