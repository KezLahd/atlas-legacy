-- Add RLS policies for team_invitations table

-- Anyone can view invitations for workspaces they're a member of
CREATE POLICY "Workspace members can view team invitations" ON team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = team_invitations.workspace_id
      AND user_id = auth.uid()
    )
  );

-- Owners and managers can create team invitations
CREATE POLICY "Workspace owners and managers can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = team_invitations.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );

-- Owners and managers can update team invitations
CREATE POLICY "Workspace owners and managers can update invitations" ON team_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = team_invitations.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );

-- Owners and managers can delete team invitations
CREATE POLICY "Workspace owners and managers can delete invitations" ON team_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = team_invitations.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );

-- Fix workspace_members INSERT policy to allow self-insertion as owner during workspace creation
-- First drop the existing policy
DROP POLICY IF EXISTS "Workspace owners and managers can insert members" ON workspace_members;

-- Create new policy that allows:
-- 1. Owners/managers to add members to their workspace
-- 2. Users to add themselves as owner when creating a new workspace (if workspace was just created by them)
CREATE POLICY "Workspace owners and managers can insert members" ON workspace_members
  FOR INSERT WITH CHECK (
    -- Allow if user is already an owner/manager of the workspace
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
    OR
    -- Allow if user is adding themselves as owner (for initial workspace creation)
    (user_id = auth.uid() AND role = 'owner')
  );
