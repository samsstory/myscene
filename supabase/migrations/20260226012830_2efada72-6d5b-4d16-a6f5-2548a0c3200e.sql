
-- Allow authenticated users to read all show_rankings for community leaderboard
CREATE POLICY "Authenticated users can read rankings for leaderboard"
ON public.show_rankings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to read all show_comparisons for community leaderboard
CREATE POLICY "Authenticated users can read comparisons for leaderboard"
ON public.show_comparisons
FOR SELECT
USING (auth.uid() IS NOT NULL);
