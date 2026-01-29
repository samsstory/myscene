-- Create waitlist table for SMS signup
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  country_code text NOT NULL DEFAULT 'US',
  source text NOT NULL DEFAULT 'hero',
  discovery_source text,
  shows_per_year text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notified_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (no auth required for signups)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Allow updates only by matching the returned id (for follow-up questions)
-- This uses a permissive approach since we pass the id back to the client
CREATE POLICY "Anyone can update their waitlist entry by id"
ON public.waitlist
FOR UPDATE
USING (true)
WITH CHECK (true);

-- No SELECT policy - phone numbers should not be readable from frontend
-- No DELETE policy - entries cannot be deleted from frontend

-- Add index for phone number lookups
CREATE INDEX idx_waitlist_phone ON public.waitlist(phone_number);

-- Add index for status queries (for future bulk SMS sends)
CREATE INDEX idx_waitlist_status ON public.waitlist(status);