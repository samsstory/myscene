
-- Table to log each backfill-artist-images cron run
CREATE TABLE public.backfill_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamp with time zone NOT NULL DEFAULT now(),
  requested integer NOT NULL DEFAULT 0,
  enriched integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'cron',
  details jsonb DEFAULT '{}'::jsonb
);

-- Only admins can read these logs
ALTER TABLE public.backfill_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read backfill logs"
  ON public.backfill_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts (from edge function), no user INSERT policy needed
