-- Create event_completion_tracking table
CREATE TABLE IF NOT EXISTS event_completion_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'rescheduled', 'dismissed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_completion_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own completion tracking
CREATE POLICY "Users can view their own event completion tracking"
  ON event_completion_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can manage their own completion tracking
CREATE POLICY "Users can manage their own event completion tracking"
  ON event_completion_tracking
  FOR ALL
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_completion_user_id ON event_completion_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_event_completion_status ON event_completion_tracking(status);
CREATE INDEX IF NOT EXISTS idx_event_completion_event_id ON event_completion_tracking(event_id);

-- Create function to automatically create pending completion tracking for relevant events
CREATE OR REPLACE FUNCTION create_event_completion_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create tracking for filming, editing, posting, and review events
  IF NEW.category IN ('filming', 'editing', 'posting', 'review') AND NEW.assigned_to IS NOT NULL THEN
    -- Insert completion tracking for assigned user
    INSERT INTO event_completion_tracking (event_id, user_id, workspace_id, status)
    VALUES (NEW.id, NEW.assigned_to, NEW.workspace_id, 'pending')
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    -- Also create for team members
    INSERT INTO event_completion_tracking (event_id, user_id, workspace_id, status)
    SELECT NEW.id, user_id, NEW.workspace_id, 'pending'
    FROM event_team_members
    WHERE event_id = NEW.id
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create completion tracking
DROP TRIGGER IF EXISTS trigger_create_event_completion_tracking ON calendar_events;
CREATE TRIGGER trigger_create_event_completion_tracking
  AFTER INSERT OR UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION create_event_completion_tracking();

COMMENT ON TABLE event_completion_tracking IS 'Tracks completion status of calendar events that require confirmation (filming, editing, posting, review)';
