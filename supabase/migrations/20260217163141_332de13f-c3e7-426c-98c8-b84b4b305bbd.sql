-- Create quotes table for loading screen quotes
CREATE TABLE public.loading_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loading_quotes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active quotes (needed for the loader)
CREATE POLICY "Authenticated users can read active quotes"
  ON public.loading_quotes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert quotes"
  ON public.loading_quotes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quotes"
  ON public.loading_quotes FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quotes"
  ON public.loading_quotes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed with the existing quote
INSERT INTO public.loading_quotes (text, author) VALUES
  ('Very often a change of self is needed more than a change of scene.', 'Arthur Christopher Benson'),
  ('Music is the shorthand of emotion.', 'Leo Tolstoy'),
  ('Without music, life would be a mistake.', 'Friedrich Nietzsche'),
  ('One good thing about music, when it hits you, you feel no pain.', 'Bob Marley'),
  ('Music expresses that which cannot be said and on which it is impossible to be silent.', 'Victor Hugo');