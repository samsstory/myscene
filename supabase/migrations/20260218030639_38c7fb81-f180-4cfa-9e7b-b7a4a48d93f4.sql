ALTER TABLE public.upcoming_shows
ADD COLUMN rsvp_status text NOT NULL DEFAULT 'going' CHECK (rsvp_status IN ('going', 'maybe', 'not_going'));