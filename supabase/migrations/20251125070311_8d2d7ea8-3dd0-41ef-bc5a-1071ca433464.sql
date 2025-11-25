-- Create show_rankings table for ELO-based ranking system
CREATE TABLE public.show_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  elo_score INTEGER NOT NULL DEFAULT 1200,
  comparisons_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, show_id)
);

-- Enable RLS
ALTER TABLE public.show_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rankings"
  ON public.show_rankings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rankings"
  ON public.show_rankings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rankings"
  ON public.show_rankings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rankings"
  ON public.show_rankings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_show_rankings_updated_at
  BEFORE UPDATE ON public.show_rankings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_show_rankings_user_id ON public.show_rankings(user_id);
CREATE INDEX idx_show_rankings_elo_score ON public.show_rankings(user_id, elo_score DESC);