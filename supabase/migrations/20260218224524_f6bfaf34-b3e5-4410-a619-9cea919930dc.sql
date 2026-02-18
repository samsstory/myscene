
-- The two existing SELECT policies on upcoming_shows are both RESTRICTIVE,
-- meaning a row must pass ALL of them (AND logic). This prevents friends' shows
-- from being visible. Replace them with a single PERMISSIVE policy using OR logic.

DROP POLICY IF EXISTS "Users can view their own upcoming shows" ON upcoming_shows;
DROP POLICY IF EXISTS "Followers can view upcoming shows of followed users" ON upcoming_shows;

-- Single permissive policy: own shows OR shows from people you follow
CREATE POLICY "Users can view own and followed users upcoming shows"
ON public.upcoming_shows
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by_user_id
  OR EXISTS (
    SELECT 1 FROM public.followers
    WHERE followers.follower_id = auth.uid()
      AND followers.following_id = upcoming_shows.created_by_user_id
  )
);
