
CREATE TABLE public.push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  target_type text NOT NULL DEFAULT 'broadcast',
  target_user_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  url text DEFAULT '/',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  total_devices integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read push logs"
  ON public.push_notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert push logs"
  ON public.push_notification_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
