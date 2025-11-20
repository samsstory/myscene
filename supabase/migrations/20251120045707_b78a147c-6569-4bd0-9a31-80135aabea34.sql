-- Add venue_id foreign key to shows table for better data relationships
ALTER TABLE public.shows 
ADD COLUMN venue_id uuid REFERENCES public.venues(id);

-- Add coordinates to profiles table for user's home city
ALTER TABLE public.profiles 
ADD COLUMN home_latitude numeric,
ADD COLUMN home_longitude numeric;

-- Create index on venue_id for better query performance
CREATE INDEX idx_shows_venue_id ON public.shows(venue_id);