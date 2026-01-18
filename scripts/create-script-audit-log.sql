-- Create script audit log table for tracking all script editing changes
CREATE TABLE IF NOT EXISTS script_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_profiles UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL, -- 'saved', 'finalised', 'scene_added', 'scene_deleted', 'scene_content_changed', 'hook_changed', 'cta_changed'
  scene_number INTEGER, -- Which scene was affected (null for overall changes like saved/finalised)
  field_changed TEXT, -- Which field was modified (e.g., 'audio_script', 'visuals', 'scenes_count', 'hook', 'cta')
  old_value TEXT, -- Previous value
  new_value TEXT, -- New value
  old_scene_count INTEGER, -- Number of scenes before change
  new_scene_count INTEGER, -- Number of scenes after change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE script_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for script audit log
CREATE POLICY "Workspace members can view script audit log for their workspace content"
  ON script_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = script_audit_log.content_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert script audit log entries"
  ON script_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_script_audit_log_content ON script_audit_log(content_id);
CREATE INDEX IF NOT EXISTS idx_script_audit_log_user ON script_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_script_audit_log_created_at ON script_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_audit_log_action ON script_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_script_audit_log_scene_number ON script_audit_log(scene_number);

COMMIT;

