-- Create venues cache table
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  city text,
  country text,
  bandsintown_id text UNIQUE,
  latitude numeric,
  longitude numeric,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster name searches
CREATE INDEX idx_venues_name ON public.venues USING gin(to_tsvector('english', name));
CREATE INDEX idx_venues_bandsintown_id ON public.venues(bandsintown_id);

-- Track which users have been to which venues (for social proof)
CREATE TABLE public.user_venues (
  user_id uuid NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  show_count integer NOT NULL DEFAULT 1,
  last_show_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

CREATE INDEX idx_user_venues_user_id ON public.user_venues(user_id);
CREATE INDEX idx_user_venues_venue_id ON public.user_venues(venue_id);

-- Artist associations for recommendations (co-occurrence tracking)
CREATE TABLE public.artist_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist1_name text NOT NULL,
  artist2_name text NOT NULL,
  co_occurrence_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist1_name, artist2_name)
);

CREATE INDEX idx_artist_associations_artist1 ON public.artist_associations(artist1_name);
CREATE INDEX idx_artist_associations_artist2 ON public.artist_associations(artist2_name);

-- Venue artist popularity for recommendations
CREATE TABLE public.venue_artist_popularity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  artist_name text NOT NULL,
  show_count integer NOT NULL DEFAULT 1,
  last_show_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venue_id, artist_name)
);

CREATE INDEX idx_venue_artist_popularity_venue ON public.venue_artist_popularity(venue_id);
CREATE INDEX idx_venue_artist_popularity_artist ON public.venue_artist_popularity(artist_name);

-- Enable RLS on all new tables
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_artist_popularity ENABLE ROW LEVEL SECURITY;

-- RLS policies for venues (read-only for all authenticated users)
CREATE POLICY "Venues are viewable by authenticated users"
  ON public.venues
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS policies for user_venues
CREATE POLICY "Users can view their own venue history"
  ON public.user_venues
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own venue history"
  ON public.user_venues
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own venue history"
  ON public.user_venues
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for artist_associations (read-only for authenticated users)
CREATE POLICY "Artist associations viewable by authenticated users"
  ON public.artist_associations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS policies for venue_artist_popularity (read-only for authenticated users)
CREATE POLICY "Venue artist popularity viewable by authenticated users"
  ON public.venue_artist_popularity
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_venues_updated_at
  BEFORE UPDATE ON public.user_venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_artist_associations_updated_at
  BEFORE UPDATE ON public.artist_associations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_artist_popularity_updated_at
  BEFORE UPDATE ON public.venue_artist_popularity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();