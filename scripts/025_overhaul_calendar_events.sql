-- Overhaul calendar_events table to include content_id, batch_id, category, and team members

-- First, drop the old calendar_invitees table
DROP TABLE IF EXISTS calendar_invitees CASCADE;

-- Recreate calendar_events with new structure
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES content(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category TEXT, -- filming, editing, meeting, deadline, etc.
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create junction table for event team members
CREATE TABLE IF NOT EXISTS event_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view event team members in their workspace"
ON event_team_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM calendar_events ce
    JOIN workspace_members wm ON wm.workspace_id = ce.workspace_id
    WHERE ce.id = event_team_members.event_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage event team members in their workspace"
ON event_team_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM calendar_events ce
    JOIN workspace_members wm ON wm.workspace_id = ce.workspace_id
    WHERE ce.id = event_team_members.event_id
    AND wm.user_id = auth.uid()
  )
);
