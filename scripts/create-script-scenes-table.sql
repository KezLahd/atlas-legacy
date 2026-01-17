-- Create script_scenes table to store individual scenes for content
CREATE TABLE IF NOT EXISTS script_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  audio_script TEXT,
  visuals TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, scene_number)
);

-- Enable RLS
ALTER TABLE script_scenes ENABLE ROW LEVEL SECURITY;

-- RLS policies for script_scenes
CREATE POLICY "Users can view script scenes for their workspace content"
  ON script_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      JOIN creators ON content.creator_id = creators.id
      JOIN workspace_members ON creators.workspace_id = workspace_members.workspace_id
      WHERE content.id = script_scenes.content_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Contributors can manage script scenes"
  ON script_scenes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content
      JOIN creators ON content.creator_id = creators.id
      JOIN workspace_members ON creators.workspace_id = workspace_members.workspace_id
      WHERE content.id = script_scenes.content_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'manager', 'contributor')
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_script_scenes_content_id ON script_scenes(content_id);
CREATE INDEX IF NOT EXISTS idx_script_scenes_scene_number ON script_scenes(content_id, scene_number);
