-- Fix creator_access RLS policy to allow workspace members to view access records for creators in their workspace
-- This allows proper display of creator names in the content table

DROP POLICY IF EXISTS "View creator access if workspace member" ON creator_access;

CREATE POLICY "View creator access if workspace member" ON creator_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN creators c ON c.id = creator_id
      WHERE wm.workspace_id = c.workspace_id AND wm.user_id = auth.uid()
    )
  );
