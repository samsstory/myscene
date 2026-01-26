-- Make the rating column nullable since we're moving to head-to-head ranking
ALTER TABLE public.shows 
ALTER COLUMN rating DROP NOT NULL;

-- Set a default of NULL for new shows
ALTER TABLE public.shows 
ALTER COLUMN rating SET DEFAULT NULL;