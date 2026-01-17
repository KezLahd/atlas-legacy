-- Add user_id and workspace_id to SFX reference table
ALTER TABLE sfx_reference ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE sfx_reference ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE sfx_reference DROP CONSTRAINT IF EXISTS sfx_reference_name_key;

-- Remove category column from sfx_reference
ALTER TABLE sfx_reference DROP COLUMN IF EXISTS category;

-- Update RLS policies for SFX to allow workspace members to add
DROP POLICY IF EXISTS "Anyone can view SFX" ON sfx_reference;
DROP POLICY IF EXISTS "Workspace members can add SFX" ON sfx_reference;

-- Allow workspace members to view all SFX (global + their workspace)
CREATE POLICY "Users can view all SFX" ON sfx_reference FOR SELECT USING (true);

-- Allow workspace members to insert SFX
CREATE POLICY "Workspace members can add SFX" ON sfx_reference FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Add user_id to broll_reference
ALTER TABLE broll_reference ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing B-roll RLS to include user tracking
DROP POLICY IF EXISTS "Workspace members can manage B-roll" ON broll_reference;

CREATE POLICY "Workspace members can add B-roll" ON broll_reference FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Workspace members can update B-roll" ON broll_reference FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete B-roll" ON broll_reference FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
