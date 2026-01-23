-- Comprehensive fix for all auth.users foreign key constraints
-- This script ensures ALL tables properly cascade or set null on user deletion

-- First, let's check and fix creators.user_id
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_user_id_fkey;
ALTER TABLE creators ADD CONSTRAINT creators_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix workspace_members.user_id (should already be CASCADE but let's ensure)
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix user_profiles.id (should already be CASCADE but let's ensure)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify event_team_members has CASCADE (should be from script 041)
ALTER TABLE event_team_members DROP CONSTRAINT IF EXISTS event_team_members_user_id_fkey;
ALTER TABLE event_team_members ADD CONSTRAINT event_team_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify event_completion_tracking has CASCADE
ALTER TABLE event_completion_tracking DROP CONSTRAINT IF EXISTS event_completion_tracking_user_id_fkey;
ALTER TABLE event_completion_tracking ADD CONSTRAINT event_completion_tracking_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure all audit logs CASCADE
ALTER TABLE content_audit_log DROP CONSTRAINT IF EXISTS content_audit_log_user_id_fkey;
ALTER TABLE content_audit_log ADD CONSTRAINT content_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE research_audit_log DROP CONSTRAINT IF EXISTS research_audit_log_user_id_fkey;
ALTER TABLE research_audit_log ADD CONSTRAINT research_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE script_audit_log DROP CONSTRAINT IF EXISTS script_audit_log_user_id_fkey;
ALTER TABLE script_audit_log ADD CONSTRAINT script_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE event_audit_log DROP CONSTRAINT IF EXISTS event_audit_log_user_id_fkey;
ALTER TABLE event_audit_log ADD CONSTRAINT event_audit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
