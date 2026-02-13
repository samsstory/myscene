
-- Add email column to waitlist table
ALTER TABLE public.waitlist ADD COLUMN email text;

-- Make phone_number nullable (existing rows have it, new ones will have email instead)
ALTER TABLE public.waitlist ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE public.waitlist ALTER COLUMN phone_number SET DEFAULT '';

-- Add unique constraint on email to prevent duplicates
CREATE UNIQUE INDEX idx_waitlist_email ON public.waitlist (email) WHERE email IS NOT NULL AND email != '';
