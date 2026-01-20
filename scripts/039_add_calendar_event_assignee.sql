-- Add assignee field to calendar_events to allow events to be assigned to specific team members
-- This enables proper role-based access control for calendar events

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to ON calendar_events(assigned_to);

-- Update RLS policies to include assignee-based access
DROP POLICY IF EXISTS "Calendar events are viewable by workspace members" ON calendar_events;
CREATE POLICY "Calendar events are viewable by workspace members" ON calendar_events
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Allow editing events if user created them or is assigned to them or has edit permissions
DROP POLICY IF EXISTS "Calendar events are manageable by workspace members" ON calendar_events;
CREATE POLICY "Calendar events are manageable by workspace members" ON calendar_events
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager', 'strategist')
    )
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );
