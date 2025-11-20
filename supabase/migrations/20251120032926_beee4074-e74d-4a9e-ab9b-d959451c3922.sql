-- Add additional rating fields to shows table
ALTER TABLE public.shows
ADD COLUMN artist_performance integer CHECK (artist_performance >= 1 AND artist_performance <= 5),
ADD COLUMN sound integer CHECK (sound >= 1 AND sound <= 5),
ADD COLUMN lighting integer CHECK (lighting >= 1 AND lighting <= 5),
ADD COLUMN crowd integer CHECK (crowd >= 1 AND crowd <= 5),
ADD COLUMN venue_vibe integer CHECK (venue_vibe >= 1 AND venue_vibe <= 5),
ADD COLUMN notes text CHECK (char_length(notes) <= 500);