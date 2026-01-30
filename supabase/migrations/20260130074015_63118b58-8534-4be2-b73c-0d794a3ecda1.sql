-- Add column to track shows where user explicitly declined adding a photo
ALTER TABLE public.shows ADD COLUMN photo_declined boolean NOT NULL DEFAULT false;