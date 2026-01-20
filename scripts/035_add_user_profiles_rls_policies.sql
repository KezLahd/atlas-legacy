-- Add RLS policies for user_profiles so workspace members can view each other's profiles
-- This allows content attribution to show who created content

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to view profiles of workspace members
CREATE POLICY "Users can view workspace member profiles" ON user_profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM workspace_members
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
