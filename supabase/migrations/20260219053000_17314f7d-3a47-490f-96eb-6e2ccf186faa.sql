-- Allow users to see show_rankings of people they follow
CREATE POLICY "Users can view followed users rankings"
ON public.show_rankings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM followers
    WHERE followers.follower_id = auth.uid()
    AND followers.following_id = show_rankings.user_id
  )
);