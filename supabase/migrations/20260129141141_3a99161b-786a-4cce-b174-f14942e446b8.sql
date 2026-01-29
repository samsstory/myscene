-- Add referral_code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN referral_code text UNIQUE;

-- Create function to generate short referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Generate unique code
  LOOP
    new_code := generate_referral_code();
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profile_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.set_referral_code();

-- Backfill existing profiles with referral codes
DO $$
DECLARE
  profile_record RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR profile_record IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE profiles SET referral_code = new_code WHERE id = profile_record.id;
  END LOOP;
END;
$$;

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  converted_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view referrals they made
CREATE POLICY "Users can view their sent referrals"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- Policy for inserting referrals (done during signup, needs service role or trigger)
CREATE POLICY "Referrals can be created on signup"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- Create index for lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);