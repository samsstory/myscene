
-- Crowdsource RPC: let authenticated users contribute festival lineups
-- to the global registry (normally admin-only via RLS).
-- Uses SECURITY DEFINER to bypass the admin-only INSERT policy.

CREATE OR REPLACE FUNCTION public.crowdsource_festival_lineup(
  p_event_name TEXT,
  p_year INTEGER,
  p_date_start DATE DEFAULT NULL,
  p_date_end DATE DEFAULT NULL,
  p_venue_name TEXT DEFAULT NULL,
  p_venue_location TEXT DEFAULT NULL,
  p_venue_id UUID DEFAULT NULL,
  p_artists JSONB DEFAULT '[]'::jsonb,
  p_source TEXT DEFAULT 'crowdsource',
  p_source_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF trim(p_event_name) = '' THEN
    RAISE EXCEPTION 'Event name is required';
  END IF;

  IF p_year < 1950 OR p_year > extract(year FROM now()) + 2 THEN
    RAISE EXCEPTION 'Invalid year';
  END IF;

  -- Upsert into festival_lineups (unique on event_name + year via existing constraint)
  INSERT INTO festival_lineups (
    event_name, year, date_start, date_end,
    venue_name, venue_location, venue_id,
    artists, source, source_url
  ) VALUES (
    trim(p_event_name), p_year, p_date_start, p_date_end,
    p_venue_name, p_venue_location, p_venue_id,
    p_artists, p_source, p_source_url
  )
  ON CONFLICT (event_name, year) DO UPDATE SET
    artists = EXCLUDED.artists,
    date_start = COALESCE(EXCLUDED.date_start, festival_lineups.date_start),
    date_end = COALESCE(EXCLUDED.date_end, festival_lineups.date_end),
    venue_name = COALESCE(EXCLUDED.venue_name, festival_lineups.venue_name),
    venue_location = COALESCE(EXCLUDED.venue_location, festival_lineups.venue_location),
    venue_id = COALESCE(EXCLUDED.venue_id, festival_lineups.venue_id),
    source = EXCLUDED.source,
    source_url = COALESCE(EXCLUDED.source_url, festival_lineups.source_url),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
