-- Create show_comparisons table to track user's show comparisons
CREATE TABLE public.show_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show1_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  show2_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.shows(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure show1_id is always less than show2_id to prevent duplicate pairs
  CONSTRAINT show1_less_than_show2 CHECK (show1_id < show2_id),
  -- Prevent the same pair from being compared twice by the same user
  CONSTRAINT unique_user_comparison UNIQUE (user_id, show1_id, show2_id)
);

-- Enable Row Level Security
ALTER TABLE public.show_comparisons ENABLE ROW LEVEL SECURITY;

-- Users can view their own comparisons
CREATE POLICY "Users can view their own comparisons"
ON public.show_comparisons
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own comparisons
CREATE POLICY "Users can create their own comparisons"
ON public.show_comparisons
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comparisons
CREATE POLICY "Users can update their own comparisons"
ON public.show_comparisons
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comparisons
CREATE POLICY "Users can delete their own comparisons"
ON public.show_comparisons
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_show_comparisons_user_id ON public.show_comparisons(user_id);
CREATE INDEX idx_show_comparisons_shows ON public.show_comparisons(show1_id, show2_id);