
-- Enable trigram extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create events registry table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  venue_name text,
  venue_location text,
  venue_id uuid REFERENCES public.venues(id),
  event_type text NOT NULL DEFAULT 'festival',
  year integer,
  created_by_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, year)
);

-- Title-case function for standardizing event names
CREATE OR REPLACE FUNCTION public.title_case(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT string_agg(
    upper(left(word, 1)) || lower(substring(word from 2)),
    ' '
  )
  FROM unnest(string_to_array(trim(input), ' ')) AS word
$$;

-- Trigger to auto-standardize event name on insert/update
CREATE OR REPLACE FUNCTION public.standardize_event_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.name := public.title_case(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER standardize_event_name_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.standardize_event_name();

-- Updated_at trigger
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read events (shared catalog)
CREATE POLICY "Authenticated users can read events"
ON public.events FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Anyone authenticated can create events
CREATE POLICY "Authenticated users can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = created_by_user_id);

-- Creator can update their events
CREATE POLICY "Creator can update their events"
ON public.events FOR UPDATE
USING (auth.uid() = created_by_user_id);

-- Indexes
CREATE INDEX idx_events_name_trgm ON public.events USING gin (name gin_trgm_ops);
CREATE INDEX idx_events_year ON public.events (year);
