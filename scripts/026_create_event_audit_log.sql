-- Create event audit log table
CREATE TABLE IF NOT EXISTS event_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changed_fields JSONB, -- Store what fields were changed (for updates)
  old_values JSONB, -- Store old values (for updates/deletes)
  new_values JSONB, -- Store new values (for creates/updates)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_event_audit_log_event_id ON event_audit_log(event_id);
CREATE INDEX idx_event_audit_log_workspace_id ON event_audit_log(workspace_id);
CREATE INDEX idx_event_audit_log_user_id ON event_audit_log(user_id);
CREATE INDEX idx_event_audit_log_created_at ON event_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE event_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for their workspace
CREATE POLICY "Users can view audit logs for their workspace"
  ON event_audit_log
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy: System can insert audit logs (no direct user access)
CREATE POLICY "System can insert audit logs"
  ON event_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;
