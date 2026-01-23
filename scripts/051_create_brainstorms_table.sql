-- Create brainstorms table
CREATE TABLE IF NOT EXISTS brainstorms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE brainstorms ENABLE ROW LEVEL SECURITY;

-- Users can view brainstorms in their workspace
CREATE POLICY "Users can view brainstorms in their workspace"
ON brainstorms FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Users can create their own brainstorms
CREATE POLICY "Users can create their own brainstorms"
ON brainstorms FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Users can update their own brainstorms
CREATE POLICY "Users can update their own brainstorms"
ON brainstorms FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own brainstorms
CREATE POLICY "Users can delete their own brainstorms"
ON brainstorms FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_brainstorms_user_workspace ON brainstorms(user_id, workspace_id);
CREATE INDEX idx_brainstorms_created_at ON brainstorms(created_at DESC);
CREATE INDEX idx_brainstorms_content_id ON brainstorms(content_id) WHERE content_id IS NOT NULL;
