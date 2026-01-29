-- Add avatar_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN avatar_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture stored in show-photos bucket';