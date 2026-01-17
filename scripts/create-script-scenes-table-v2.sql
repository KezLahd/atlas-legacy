-- Create script_scenes table to store scene-by-scene script breakdown
CREATE TABLE IF NOT EXISTS script_scenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  audio_script TEXT, -- What the creator says
  visuals TEXT, -- What's happening visually in the scene
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure scene numbers are unique per content
  UNIQUE(content_id, scene_number)
);

-- Enable RLS
ALTER TABLE script_scenes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view script scenes if they're in the workspace
CREATE POLICY "Users can view script scenes in their workspace"
  ON script_scenes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = script_scenes.content_id
        AND wm.user_id = auth.uid()
    )
  );

-- Policy: Users can manage script scenes if they're in the workspace
CREATE POLICY "Users can manage script scenes in their workspace"
  ON script_scenes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = script_scenes.content_id
        AND wm.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_script_scenes_content_id ON script_scenes(content_id);
CREATE INDEX idx_script_scenes_scene_number ON script_scenes(content_id, scene_number);
