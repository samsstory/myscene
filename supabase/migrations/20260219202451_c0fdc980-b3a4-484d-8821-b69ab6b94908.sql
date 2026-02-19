-- Drop the check constraint that restricts show_type values
ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_show_type_check;

-- Rename show_type values: show -> set first, then showcase -> show
UPDATE shows SET show_type = 'set' WHERE show_type = 'show';
UPDATE shows SET show_type = 'show' WHERE show_type = 'showcase';

-- Update default column value
ALTER TABLE shows ALTER COLUMN show_type SET DEFAULT 'set';

-- Add updated check constraint with new valid values
ALTER TABLE shows ADD CONSTRAINT shows_show_type_check CHECK (show_type IN ('set', 'show', 'festival'));
