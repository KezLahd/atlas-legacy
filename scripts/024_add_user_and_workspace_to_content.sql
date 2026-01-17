-- Add created_by, updated_by, and workspace_id to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES user_profiles(id);
ALTER TABLE content ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES user_profiles(id);
ALTER TABLE content ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) NOT NULL;

-- Create index for workspace_id lookups
CREATE INDEX IF NOT EXISTS idx_content_workspace_id ON content(workspace_id);

-- Update RLS policy for content to check workspace membership
DROP POLICY IF EXISTS "Users can view content in their workspace" ON content;
CREATE POLICY "Users can view content in their workspace" ON content
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert content in their workspace" ON content;
CREATE POLICY "Users can insert content in their workspace" ON content
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update content in their workspace" ON content;
CREATE POLICY "Users can update content in their workspace" ON content
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
