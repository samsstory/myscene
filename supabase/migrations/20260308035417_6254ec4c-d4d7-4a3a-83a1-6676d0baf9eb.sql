-- Update handle_new_user to persist full_name and username from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, home_city)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'home_city'
  );
  RETURN new;
END;
$function$;

-- Add unique constraint on username (allow nulls for existing users)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);