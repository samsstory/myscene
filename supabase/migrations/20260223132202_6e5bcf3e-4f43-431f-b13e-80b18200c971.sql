
-- Edmtrain events cache table
-- Stores fetched events with TTL for compliance (max 24h cache, no past events)
CREATE TABLE public.edmtrain_events (
  id SERIAL PRIMARY KEY,
  edmtrain_id INTEGER NOT NULL UNIQUE,
  event_name TEXT,
  event_link TEXT NOT NULL,
  event_date DATE NOT NULL,
  festival_ind BOOLEAN NOT NULL DEFAULT false,
  ages TEXT,
  venue_name TEXT,
  venue_location TEXT,
  venue_address TEXT,
  venue_latitude NUMERIC,
  venue_longitude NUMERIC,
  artists JSONB NOT NULL DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location_key TEXT NOT NULL -- e.g. "lat:33.96,lng:-118.36" to track which fetch populated this
);

-- Index for fast lookups
CREATE INDEX idx_edmtrain_events_date ON public.edmtrain_events (event_date);
CREATE INDEX idx_edmtrain_events_location ON public.edmtrain_events (location_key);
CREATE INDEX idx_edmtrain_events_fetched ON public.edmtrain_events (fetched_at);

-- Enable RLS
ALTER TABLE public.edmtrain_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read cached events (this is a shared cache)
CREATE POLICY "Authenticated users can read edmtrain events"
  ON public.edmtrain_events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only service role can insert/update/delete (edge function uses service role)
-- No user-facing write policies needed
