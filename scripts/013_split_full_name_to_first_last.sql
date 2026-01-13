-- Split full_name into first_name and last_name in user_profiles table

-- Add first_name and last_name columns
ALTER TABLE user_profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Drop the full_name column
ALTER TABLE user_profiles 
DROP COLUMN full_name;

-- Update the trigger to use first_name and last_name from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, first_name, last_name, is_admin)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'first_name', null),
    COALESCE(new.raw_user_meta_data ->> 'last_name', null),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;
