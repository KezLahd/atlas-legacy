-- Fix RLS policy to allow users to add themselves as owner during workspace creation

-- Drop the existing policy
DROP POLICY IF EXISTS "Workspace owners and managers can insert members" ON workspace_members;

-- Create new policy that allows:
-- 1. Adding yourself as owner (for workspace creation)
-- 2. Owners/managers adding other members
CREATE POLICY "Allow workspace member insertion" ON workspace_members
  FOR INSERT WITH CHECK (
    -- Allow inserting yourself as owner (for new workspaces)
    (user_id = auth.uid() AND role = 'owner')
    OR
    -- Allow existing owners/managers to add new members
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
  );
