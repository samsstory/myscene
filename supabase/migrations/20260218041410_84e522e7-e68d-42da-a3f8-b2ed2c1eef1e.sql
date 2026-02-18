
-- Create SECURITY DEFINER functions for anonymous show invite previews
-- These bypass RLS to return only safe, minimal public fields

CREATE OR REPLACE FUNCTION public.get_show_invite_preview(p_show_id uuid)
RETURNS TABLE(
  show_id uuid,
  artist_name text,
  artist_image_url text,
  venue_name text,
  venue_location text,
  show_date date,
  photo_url text,
  inviter_full_name text,
  inviter_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS show_id,
    COALESCE(sa.artist_name, 'Unknown Artist') AS artist_name,
    sa.artist_image_url,
    s.venue_name,
    s.venue_location,
    s.show_date,
    s.photo_url,
    p.full_name AS inviter_full_name,
    p.username AS inviter_username
  FROM shows s
  LEFT JOIN show_artists sa ON sa.show_id = s.id AND sa.is_headliner = true
  LEFT JOIN profiles p ON p.id = s.user_id
  WHERE s.id = p_show_id
  LIMIT 1;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_show_invite_preview(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_show_invite_preview(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_upcoming_show_invite_preview(p_show_id uuid)
RETURNS TABLE(
  show_id uuid,
  artist_name text,
  artist_image_url text,
  venue_name text,
  venue_location text,
  show_date date,
  inviter_full_name text,
  inviter_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    us.id AS show_id,
    us.artist_name,
    us.artist_image_url,
    us.venue_name,
    us.venue_location,
    us.show_date,
    p.full_name AS inviter_full_name,
    p.username AS inviter_username
  FROM upcoming_shows us
  LEFT JOIN profiles p ON p.id = us.created_by_user_id
  WHERE us.id = p_show_id
  LIMIT 1;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_upcoming_show_invite_preview(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_upcoming_show_invite_preview(uuid) TO authenticated;
