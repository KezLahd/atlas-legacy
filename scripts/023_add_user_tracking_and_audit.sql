-- Add user tracking columns to content table
ALTER TABLE content 
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Create audit log table for tracking all changes
CREATE TABLE content_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_profiles UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', etc.
  field_changed TEXT, -- which field was modified
  old_value TEXT, -- previous value
  new_value TEXT, -- new value
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Workspace members can view audit log for their workspace content"
  ON content_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content c
      INNER JOIN creators cr ON c.creator_id = cr.id
      INNER JOIN workspace_members wm ON cr.workspace_id = wm.workspace_id
      WHERE c.id = content_audit_log.content_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert audit log entries"
  ON content_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_content_created_by ON content(created_by);
CREATE INDEX idx_content_updated_by ON content(updated_by);
CREATE INDEX idx_audit_log_content ON content_audit_log(content_id);
CREATE INDEX idx_audit_log_user ON content_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON content_audit_log(created_at DESC);
