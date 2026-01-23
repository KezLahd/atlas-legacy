-- Fix all foreign keys to auth.users with explicit schema qualification
-- This ensures CASCADE deletes can find the tables properly

-- 1. Drop ALL existing foreign keys to auth.users
ALTER TABLE IF EXISTS public.creators DROP CONSTRAINT IF EXISTS creators_user_id_fkey;
ALTER TABLE IF EXISTS public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE IF EXISTS public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE IF EXISTS public.content DROP CONSTRAINT IF EXISTS content_assigned_to_fkey;
ALTER TABLE IF EXISTS public.content DROP CONSTRAINT IF EXISTS content_created_by_fkey;
ALTER TABLE IF EXISTS public.content DROP CONSTRAINT IF EXISTS content_updated_by_fkey;
ALTER TABLE IF EXISTS public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;
ALTER TABLE IF EXISTS public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_assigned_to_fkey;
ALTER TABLE IF EXISTS public.event_team_members DROP CONSTRAINT IF EXISTS event_team_members_user_id_fkey;
ALTER TABLE IF EXISTS public.creator_access DROP CONSTRAINT IF EXISTS creator_access_user_id_fkey;
ALTER TABLE IF EXISTS public.content_audit_log DROP CONSTRAINT IF EXISTS content_audit_log_user_id_fkey;
ALTER TABLE IF EXISTS public.research_audit_log DROP CONSTRAINT IF EXISTS research_audit_log_user_id_fkey;
ALTER TABLE IF EXISTS public.script_audit_log DROP CONSTRAINT IF EXISTS script_audit_log_user_id_fkey;
ALTER TABLE IF EXISTS public.event_audit_log DROP CONSTRAINT IF EXISTS event_audit_log_user_id_fkey;
ALTER TABLE IF EXISTS public.event_completion_tracking DROP CONSTRAINT IF EXISTS event_completion_tracking_user_id_fkey;
ALTER TABLE IF EXISTS public.research DROP CONSTRAINT IF EXISTS research_created_by_fkey;
ALTER TABLE IF EXISTS public.research DROP CONSTRAINT IF EXISTS research_updated_by_fkey;
ALTER TABLE IF EXISTS public.broll_reference DROP CONSTRAINT IF EXISTS broll_reference_user_id_fkey;
ALTER TABLE IF EXISTS public.sfx_reference DROP CONSTRAINT IF EXISTS sfx_reference_user_id_fkey;
ALTER TABLE IF EXISTS public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_invited_by_fkey;

-- 2. Recreate all constraints with explicit schema qualification and proper CASCADE/SET NULL

-- Critical tables - CASCADE delete (user owns these)
ALTER TABLE public.creators 
  ADD CONSTRAINT creators_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.workspace_members 
  ADD CONSTRAINT workspace_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_profiles 
  ADD CONSTRAINT user_profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Audit logs - CASCADE delete (no point keeping logs without user)
ALTER TABLE public.content_audit_log 
  ADD CONSTRAINT content_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.research_audit_log 
  ADD CONSTRAINT research_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.script_audit_log 
  ADD CONSTRAINT script_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.event_audit_log 
  ADD CONSTRAINT event_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.event_team_members 
  ADD CONSTRAINT event_team_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.event_completion_tracking 
  ADD CONSTRAINT event_completion_tracking_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Content and research tables - SET NULL (preserve content when user deleted)
ALTER TABLE public.content 
  ADD CONSTRAINT content_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.content 
  ADD CONSTRAINT content_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.content 
  ADD CONSTRAINT content_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.calendar_events 
  ADD CONSTRAINT calendar_events_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.calendar_events 
  ADD CONSTRAINT calendar_events_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.research 
  ADD CONSTRAINT research_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.research 
  ADD CONSTRAINT research_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.broll_reference 
  ADD CONSTRAINT broll_reference_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.sfx_reference 
  ADD CONSTRAINT sfx_reference_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.team_invitations 
  ADD CONSTRAINT team_invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Verify the constraints are properly set
SELECT 
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND EXISTS (
    SELECT 1 
    FROM information_schema.constraint_column_usage ccu
    WHERE ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
  )
ORDER BY tc.table_name;
