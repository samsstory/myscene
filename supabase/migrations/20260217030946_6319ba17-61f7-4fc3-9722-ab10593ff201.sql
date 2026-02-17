
-- Add type and error_context columns to bug_reports
ALTER TABLE public.bug_reports
  ADD COLUMN type text NOT NULL DEFAULT 'manual',
  ADD COLUMN error_context jsonb;
