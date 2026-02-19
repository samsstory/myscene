CREATE OR REPLACE FUNCTION public.get_referral_rank(_user_id uuid)
RETURNS TABLE(user_rank bigint, total_inviters bigint, invite_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT referrer_id, COUNT(*) AS cnt
    FROM referrals
    WHERE referrer_id IS NOT NULL
    GROUP BY referrer_id
  ),
  my_count AS (
    SELECT COALESCE((SELECT cnt FROM counts WHERE referrer_id = _user_id), 0) AS cnt
  ),
  ranked AS (
    SELECT referrer_id, cnt,
      RANK() OVER (ORDER BY cnt DESC) AS rnk
    FROM counts
  )
  SELECT
    COALESCE((SELECT rnk FROM ranked WHERE referrer_id = _user_id), 
             (SELECT COUNT(*) + 1 FROM counts)) AS user_rank,
    (SELECT COUNT(DISTINCT referrer_id) FROM referrals WHERE referrer_id IS NOT NULL) AS total_inviters,
    (SELECT cnt FROM my_count) AS invite_count;
$$;