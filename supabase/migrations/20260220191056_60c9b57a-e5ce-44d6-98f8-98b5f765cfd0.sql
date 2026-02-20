
ALTER TABLE public.shows
ADD COLUMN parent_show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL;

CREATE INDEX idx_shows_parent_show_id ON public.shows(parent_show_id);
