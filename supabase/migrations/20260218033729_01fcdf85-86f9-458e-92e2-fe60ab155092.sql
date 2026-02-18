-- Create followers table
CREATE TABLE public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- RLS policies for followers
CREATE POLICY "Users can follow others"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can see who they follow"
  ON public.followers FOR SELECT
  USING (auth.uid() = follower_id);

CREATE POLICY "Users can see their own followers"
  ON public.followers FOR SELECT
  USING (auth.uid() = following_id);

-- Allow followers to view profiles of people they follow (needed for avatar fetching)
CREATE POLICY "Followers can view followed user profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followers
      WHERE follower_id = auth.uid()
        AND following_id = profiles.id
    )
  );

-- Allow users to see profiles of their followers
CREATE POLICY "Users can view their followers profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followers
      WHERE following_id = auth.uid()
        AND follower_id = profiles.id
    )
  );

-- New policy: followers can view upcoming shows of people they follow
CREATE POLICY "Followers can view upcoming shows of followed users"
  ON public.upcoming_shows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.followers
      WHERE follower_id = auth.uid()
        AND following_id = upcoming_shows.created_by_user_id
    )
  );

-- Helper function for mutual followers (Close Friends layer)
CREATE OR REPLACE FUNCTION public.get_mutual_followers(_user_id uuid)
RETURNS TABLE(profile_id uuid, username text, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url
  FROM followers f1
  JOIN followers f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
  JOIN profiles p ON p.id = f1.following_id
  WHERE f1.follower_id = _user_id
$$;