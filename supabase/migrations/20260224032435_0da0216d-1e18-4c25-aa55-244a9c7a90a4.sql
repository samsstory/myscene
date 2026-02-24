
-- 1. Create data_suggestions table
CREATE TABLE public.data_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  suggestion_type text NOT NULL,
  title text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select data suggestions"
  ON public.data_suggestions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert data suggestions"
  ON public.data_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update data suggestions"
  ON public.data_suggestions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete data suggestions"
  ON public.data_suggestions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Admin policies on venues
CREATE POLICY "Admins can update venues"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete venues"
  ON public.venues FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Admin policy on shows
CREATE POLICY "Admins can update any show"
  ON public.shows FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Admin policies on user_venues (needed for merge reassignment)
CREATE POLICY "Admins can update any user venue"
  ON public.user_venues FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any user venue"
  ON public.user_venues FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
