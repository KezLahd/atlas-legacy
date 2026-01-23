-- Fix all foreign key constraints to auth.users to use ON DELETE CASCADE or SET NULL
-- This allows proper deletion of users from auth.users table

-- Drop and recreate foreign keys with proper CASCADE behavior

-- 1. content.assigned_to - SET NULL when user is deleted (preserve content)
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_assigned_to_fkey;
ALTER TABLE content ADD CONSTRAINT content_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. content.created_by and updated_by - SET NULL when user is deleted (preserve content)
ALTER TABLE content DROP CONSTRAINT IF EXISTS content_created_by_fkey;
ALTER TABLE content ADD CONSTRAINT content_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE content DROP CONSTRAINT IF EXISTS content_updated_by_fkey;
ALTER TABLE content ADD CONSTRAINT content_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. calendar_events.created_by - SET NULL when user is deleted (preserve events)
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. calendar_events.assigned_to - SET NULL when user is deleted (unassign events)
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_assigned_to_fkey;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. team_invitations.invited_by - SET NULL when user is deleted (preserve invitation)
ALTER TABLE team_invitations DROP CONSTRAINT IF EXISTS team_invitations_invited_by_fkey;
ALTER TABLE team_invitations ADD CONSTRAINT team_invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. content_audit_log.user_id - CASCADE delete (if user deleted, remove their audit logs)
ALTER TABLE content_audit_log DROP CONSTRAINT IF EXISTS content_audit_log_user_id_fkey;
ALTER TABLE content_audit_log ADD CONSTRAINT content_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. research.created_by and updated_by - SET NULL when user is deleted (preserve research)
ALTER TABLE research DROP CONSTRAINT IF EXISTS research_created_by_fkey;
ALTER TABLE research ADD CONSTRAINT research_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE research DROP CONSTRAINT IF EXISTS research_updated_by_fkey;
ALTER TABLE research ADD CONSTRAINT research_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. research_audit_log.user_id - CASCADE delete (if user deleted, remove their audit logs)
ALTER TABLE research_audit_log DROP CONSTRAINT IF EXISTS research_audit_log_user_id_fkey;
ALTER TABLE research_audit_log ADD CONSTRAINT research_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. script_audit_log.user_id - CASCADE delete (if user deleted, remove their audit logs)
ALTER TABLE script_audit_log DROP CONSTRAINT IF EXISTS script_audit_log_user_id_fkey;
ALTER TABLE script_audit_log ADD CONSTRAINT script_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. event_audit_log.user_id - CASCADE delete (if user deleted, remove their audit logs)
ALTER TABLE event_audit_log DROP CONSTRAINT IF EXISTS event_audit_log_user_id_fkey;
ALTER TABLE event_audit_log ADD CONSTRAINT event_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 11. event_team_members.user_id - CASCADE delete (if user deleted, remove from events)
ALTER TABLE event_team_members DROP CONSTRAINT IF EXISTS event_team_members_user_id_fkey;
ALTER TABLE event_team_members ADD CONSTRAINT event_team_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 12. event_completion_tracking.user_id - CASCADE delete (if user deleted, remove their tracking)
ALTER TABLE event_completion_tracking DROP CONSTRAINT IF EXISTS event_completion_tracking_user_id_fkey;
ALTER TABLE event_completion_tracking ADD CONSTRAINT event_completion_tracking_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 13. broll_reference.user_id - SET NULL when user is deleted (preserve broll)
ALTER TABLE broll_reference DROP CONSTRAINT IF EXISTS broll_reference_user_id_fkey;
ALTER TABLE broll_reference ADD CONSTRAINT broll_reference_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 14. sfx_reference.user_id - SET NULL when user is deleted (preserve sfx)
ALTER TABLE sfx_reference DROP CONSTRAINT IF EXISTS sfx_reference_user_id_fkey;
ALTER TABLE sfx_reference ADD CONSTRAINT sfx_reference_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
