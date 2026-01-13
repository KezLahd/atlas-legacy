-- Add foreign key relationship from workspace_members to user_profiles
-- This allows Supabase to understand the relationship and enable proper joins

ALTER TABLE workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;

ALTER TABLE workspace_members 
ADD CONSTRAINT workspace_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Create index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_profiles ON workspace_members(user_id);
