-- Add profile customization fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'initials' CHECK (avatar_type IN ('initials', 'upload')),
ADD COLUMN IF NOT EXISTS avatar_bg_color TEXT DEFAULT '#89cff0',
ADD COLUMN IF NOT EXISTS avatar_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT;

COMMIT;

-- Update existing user_profiles to have default values
UPDATE user_profiles
SET avatar_type = 'initials'
WHERE avatar_type IS NULL;

COMMIT;

-- Create storage bucket for profile avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Create storage policy for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;
