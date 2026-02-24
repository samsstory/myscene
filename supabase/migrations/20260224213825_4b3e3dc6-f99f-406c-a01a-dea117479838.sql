
-- Create festival_invites table
CREATE TABLE public.festival_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  festival_lineup_id UUID NOT NULL REFERENCES public.festival_lineups(id),
  festival_name TEXT NOT NULL,
  selected_artists JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.festival_invites ENABLE ROW LEVEL SECURITY;

-- Public read (anyone with the link)
CREATE POLICY "Anyone can view festival invites"
  ON public.festival_invites FOR SELECT
  USING (true);

-- Authenticated users create their own
CREATE POLICY "Users can create their own festival invites"
  ON public.festival_invites FOR INSERT
  WITH CHECK (auth.uid() = created_by);
