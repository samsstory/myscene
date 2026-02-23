DROP FUNCTION IF EXISTS public.get_edmtrain_event_preview(integer);

CREATE FUNCTION public.get_edmtrain_event_preview(p_edmtrain_id integer)
RETURNS TABLE(
  edmtrain_id integer,
  event_name text,
  artist_names text,
  artist_image_url text,
  venue_name text,
  venue_location text,
  event_date text,
  event_link text,
  festival_ind boolean,
  artists jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.edmtrain_id,
    e.event_name,
    COALESCE(
      CASE
        WHEN jsonb_typeof(e.artists) = 'array'
        THEN (SELECT string_agg(a->>'name', ', ') FROM jsonb_array_elements(e.artists) AS a)
        ELSE NULL
      END,
      'Event'
    ) AS artist_names,
    e.artist_image_url,
    e.venue_name,
    e.venue_location,
    e.event_date,
    e.event_link,
    e.festival_ind,
    CASE
      WHEN jsonb_typeof(e.artists) = 'array' THEN e.artists
      WHEN jsonb_typeof(e.artists) = 'string' THEN (e.artists #>> '{}')::jsonb
      ELSE '[]'::jsonb
    END AS artists
  FROM edmtrain_events e
  WHERE e.edmtrain_id = p_edmtrain_id
  LIMIT 1;
$$;