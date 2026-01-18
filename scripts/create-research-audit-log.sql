-- Add user tracking columns to research table
ALTER TABLE research 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create audit log table for tracking all research changes
CREATE TABLE IF NOT EXISTS research_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES research(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_profiles UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'metrics_updated'
  field_changed TEXT, -- which field was modified (e.g., 'hook', 'platform_id', 'views', 'likes')
  old_value TEXT, -- previous value
  new_value TEXT, -- new value
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE research_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Workspace members can view audit log for their workspace research"
  ON research_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM research r
      INNER JOIN workspace_members wm ON r.workspace_id = wm.workspace_id
      WHERE r.id = research_audit_log.research_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert audit log entries"
  ON research_audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_research_created_by ON research(created_by);
CREATE INDEX IF NOT EXISTS idx_research_updated_by ON research(updated_by);
CREATE INDEX IF NOT EXISTS idx_research_audit_log_research ON research_audit_log(research_id);
CREATE INDEX IF NOT EXISTS idx_research_audit_log_user ON research_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_research_audit_log_created_at ON research_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_audit_log_action ON research_audit_log(action);

COMMIT;

