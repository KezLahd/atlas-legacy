-- Add theme_preset column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT 'about-a-boy';

-- Add comment
COMMENT ON COLUMN user_profiles.theme_preset IS 'User selected theme preset (about-a-boy, what-about-the-girl)';
