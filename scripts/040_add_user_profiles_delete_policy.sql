-- Add DELETE policy for user_profiles table
-- This allows service role and admins to delete user profiles from console

-- Drop existing policies if needed and recreate
DROP POLICY IF EXISTS "Service role can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON user_profiles;

-- Allow service role to delete (for admin operations)
CREATE POLICY "Service role can delete profiles"
  ON user_profiles
  FOR DELETE
  TO service_role
  USING (true);

-- Allow authenticated users to delete their own profile (though this should rarely be used)
CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
