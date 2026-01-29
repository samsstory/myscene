-- Add username and full_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username text,
ADD COLUMN full_name text;