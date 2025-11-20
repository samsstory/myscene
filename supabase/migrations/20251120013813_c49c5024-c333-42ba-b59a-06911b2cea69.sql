-- Create shows table
CREATE TABLE public.shows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  venue_name TEXT NOT NULL,
  venue_location TEXT,
  show_date DATE NOT NULL,
  date_precision TEXT NOT NULL DEFAULT 'exact', -- 'exact', 'approximate', 'unknown'
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artists table for show artists
CREATE TABLE public.show_artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  is_headliner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.show_artists ENABLE ROW LEVEL SECURITY;

-- Create policies for shows
CREATE POLICY "Users can view their own shows" 
ON public.shows 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shows" 
ON public.shows 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shows" 
ON public.shows 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shows" 
ON public.shows 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for show_artists
CREATE POLICY "Users can view artists for their own shows" 
ON public.show_artists 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.shows 
  WHERE shows.id = show_artists.show_id 
  AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can create artists for their own shows" 
ON public.show_artists 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shows 
  WHERE shows.id = show_artists.show_id 
  AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can update artists for their own shows" 
ON public.show_artists 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.shows 
  WHERE shows.id = show_artists.show_id 
  AND shows.user_id = auth.uid()
));

CREATE POLICY "Users can delete artists for their own shows" 
ON public.show_artists 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.shows 
  WHERE shows.id = show_artists.show_id 
  AND shows.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shows_updated_at
BEFORE UPDATE ON public.shows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_shows_user_id ON public.shows(user_id);
CREATE INDEX idx_shows_date ON public.shows(show_date DESC);
CREATE INDEX idx_show_artists_show_id ON public.show_artists(show_id);