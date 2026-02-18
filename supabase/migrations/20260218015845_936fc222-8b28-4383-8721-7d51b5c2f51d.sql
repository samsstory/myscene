
CREATE TABLE public.upcoming_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL,
  artist_name text NOT NULL,
  venue_name text,
  venue_location text,
  show_date date,
  ticket_url text,
  source_url text,
  raw_input text,
  artist_image_url text,
  linked_show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.upcoming_shows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upcoming shows"
  ON public.upcoming_shows FOR SELECT
  USING (auth.uid() = created_by_user_id);

CREATE POLICY "Users can create their own upcoming shows"
  ON public.upcoming_shows FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their own upcoming shows"
  ON public.upcoming_shows FOR UPDATE
  USING (auth.uid() = created_by_user_id);

CREATE POLICY "Users can delete their own upcoming shows"
  ON public.upcoming_shows FOR DELETE
  USING (auth.uid() = created_by_user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.upcoming_shows;
