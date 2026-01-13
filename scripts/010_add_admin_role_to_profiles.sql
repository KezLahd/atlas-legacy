-- Add is_admin field to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Update the trigger to automatically set is_admin to true for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, is_admin)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', null),
    true  -- Every new user who signs up is an admin
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Drop and recreate the existing RLS policies for workspaces
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON workspaces;

-- Create new RLS policy that checks if user is an admin
CREATE POLICY "Admins can create workspaces" 
ON workspaces 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Keep the existing SELECT policy
CREATE POLICY "Users can view their workspaces" 
ON workspaces 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspaces.id 
    AND user_id = auth.uid()
  )
);
