
-- Table: spotify_connections (stores user's Spotify OAuth tokens)
CREATE TABLE public.spotify_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  spotify_user_id text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz
);

ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own spotify connection"
  ON public.spotify_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spotify connection"
  ON public.spotify_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spotify connection"
  ON public.spotify_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spotify connection"
  ON public.spotify_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Table: spotify_top_artists (cached taste data per user)
CREATE TABLE public.spotify_top_artists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  artist_name text NOT NULL,
  spotify_artist_id text NOT NULL,
  genres text[] DEFAULT '{}',
  popularity integer DEFAULT 0,
  time_range text NOT NULL DEFAULT 'medium_term',
  rank_position integer NOT NULL DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, spotify_artist_id, time_range)
);

ALTER TABLE public.spotify_top_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own spotify top artists"
  ON public.spotify_top_artists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spotify top artists"
  ON public.spotify_top_artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spotify top artists"
  ON public.spotify_top_artists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spotify top artists"
  ON public.spotify_top_artists FOR DELETE
  USING (auth.uid() = user_id);

-- Function: get_discover_upcoming_near_me (anonymized social proof)
CREATE OR REPLACE FUNCTION public.get_discover_upcoming_near_me(
  p_user_id uuid,
  p_city text
)
RETURNS TABLE (
  artist_name text,
  show_date date,
  venue_name text,
  venue_location text,
  artist_image_url text,
  attendee_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    us.artist_name,
    us.show_date,
    us.venue_name,
    us.venue_location,
    us.artist_image_url,
    count(DISTINCT us.created_by_user_id) AS attendee_count
  FROM upcoming_shows us
  JOIN profiles p ON p.id = us.created_by_user_id
  WHERE us.created_by_user_id != p_user_id
    AND us.show_date >= CURRENT_DATE
    AND p.home_city IS NOT NULL
    AND lower(trim(p.home_city)) = lower(trim(p_city))
  GROUP BY us.artist_name, us.show_date, us.venue_name, us.venue_location, us.artist_image_url
  ORDER BY count(DISTINCT us.created_by_user_id) DESC, us.show_date ASC
  LIMIT 30;
$$;
