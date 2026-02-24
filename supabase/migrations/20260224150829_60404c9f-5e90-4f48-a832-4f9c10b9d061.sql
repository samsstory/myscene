
-- Drop the expression-based unique index
DROP INDEX IF EXISTS idx_festival_lineups_event_year;

-- Add a plain unique constraint on (event_name, year)
ALTER TABLE public.festival_lineups
ADD CONSTRAINT uq_festival_lineups_event_year UNIQUE (event_name, year);

-- Create trigger to normalize event_name before insert/update
CREATE OR REPLACE FUNCTION public.normalize_festival_event_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.event_name := public.title_case(trim(NEW.event_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER trg_normalize_festival_event_name
BEFORE INSERT OR UPDATE ON public.festival_lineups
FOR EACH ROW
EXECUTE FUNCTION public.normalize_festival_event_name();
