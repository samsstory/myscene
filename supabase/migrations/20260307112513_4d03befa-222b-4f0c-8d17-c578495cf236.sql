
-- Delete show-related data first (cascading manually for safety)
DELETE FROM show_tags WHERE show_id IN (
  SELECT id FROM shows WHERE user_id = '695cba58-42e7-4df0-ac09-aa7ab4f96407'
);
DELETE FROM show_artists WHERE show_id IN (
  SELECT id FROM shows WHERE user_id = '695cba58-42e7-4df0-ac09-aa7ab4f96407'
);
DELETE FROM show_rankings WHERE user_id = '695cba58-42e7-4df0-ac09-aa7ab4f96407';
DELETE FROM show_comparisons WHERE user_id = '695cba58-42e7-4df0-ac09-aa7ab4f96407';
DELETE FROM shows WHERE user_id = '695cba58-42e7-4df0-ac09-aa7ab4f96407';

-- Reset profile fields so profile setup triggers again
UPDATE profiles SET 
  full_name = NULL,
  home_city = NULL,
  home_latitude = NULL,
  home_longitude = NULL,
  onboarding_step = 'welcome',
  onboarding_completed_at = NULL
WHERE id = '695cba58-42e7-4df0-ac09-aa7ab4f96407';
