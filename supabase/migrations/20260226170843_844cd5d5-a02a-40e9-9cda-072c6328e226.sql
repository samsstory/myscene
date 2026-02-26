
-- Function: extract artist names from edmtrain_events.artists JSONB and upsert into canonical artists table
CREATE OR REPLACE FUNCTION public.sync_edmtrain_artists_to_canonical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  artist_record jsonb;
  artist_name_val text;
BEGIN
  -- Parse the artists JSONB array from the new row
  IF NEW.artists IS NOT NULL AND jsonb_typeof(NEW.artists) = 'array' THEN
    FOR artist_record IN SELECT * FROM jsonb_array_elements(NEW.artists)
    LOOP
      artist_name_val := trim(artist_record ->> 'name');
      
      -- Skip empty names
      IF artist_name_val IS NOT NULL AND artist_name_val != '' THEN
        -- Upsert: insert only if not already present (matched on lowercase trimmed name)
        INSERT INTO artists (name)
        VALUES (artist_name_val)
        ON CONFLICT ((lower(trim(name)))) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: fires after insert or update on edmtrain_events
CREATE TRIGGER trg_sync_edmtrain_artists
AFTER INSERT OR UPDATE OF artists ON edmtrain_events
FOR EACH ROW
EXECUTE FUNCTION public.sync_edmtrain_artists_to_canonical();
