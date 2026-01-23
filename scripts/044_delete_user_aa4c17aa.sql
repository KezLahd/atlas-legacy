-- Comprehensive cleanup script for user: aa4c17aa-f3a1-41a8-a292-7d9c7364a833
-- This script deletes all references to this user across all tables

DO $$ 
DECLARE
  target_user_id UUID := 'aa4c17aa-f3a1-41a8-a292-7d9c7364a833';
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting cleanup for user: %', target_user_id;

  -- Delete from content_audit_log
  DELETE FROM content_audit_log WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from content_audit_log', deleted_count;

  -- Delete from research_audit_log
  DELETE FROM research_audit_log WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from research_audit_log', deleted_count;

  -- Delete from script_audit_log
  DELETE FROM script_audit_log WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from script_audit_log', deleted_count;

  -- Delete from event_audit_log
  DELETE FROM event_audit_log WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from event_audit_log', deleted_count;

  -- Update content - set created_by and updated_by to null
  UPDATE content SET created_by = NULL WHERE created_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in content (created_by)', deleted_count;

  UPDATE content SET updated_by = NULL WHERE updated_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in content (updated_by)', deleted_count;

  UPDATE content SET assigned_to = NULL WHERE assigned_to = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in content (assigned_to)', deleted_count;

  -- Update research - set created_by and updated_by to null
  UPDATE research SET created_by = NULL WHERE created_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in research (created_by)', deleted_count;

  UPDATE research SET updated_by = NULL WHERE updated_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in research (updated_by)', deleted_count;

  -- Update calendar_events - set created_by and assigned_to to null
  UPDATE calendar_events SET created_by = NULL WHERE created_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in calendar_events (created_by)', deleted_count;

  UPDATE calendar_events SET assigned_to = NULL WHERE assigned_to = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in calendar_events (assigned_to)', deleted_count;

  -- Delete from event_team_members
  DELETE FROM event_team_members WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from event_team_members', deleted_count;

  -- Delete from event_completion_tracking
  DELETE FROM event_completion_tracking WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from event_completion_tracking', deleted_count;

  -- Update team_invitations - set invited_by to null
  UPDATE team_invitations SET invited_by = NULL WHERE invited_by = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in team_invitations', deleted_count;

  -- Update broll_reference - set user_id to null
  UPDATE broll_reference SET user_id = NULL WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in broll_reference', deleted_count;

  -- Update sfx_reference - set user_id to null
  UPDATE sfx_reference SET user_id = NULL WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in sfx_reference', deleted_count;

  -- Delete from creator_access
  DELETE FROM creator_access WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from creator_access', deleted_count;

  -- Delete from creators (if they have a creator profile)
  DELETE FROM creators WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from creators', deleted_count;

  -- Delete from workspace_members
  DELETE FROM workspace_members WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from workspace_members', deleted_count;

  -- Delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from user_profiles', deleted_count;

  RAISE NOTICE 'Cleanup complete. Now you can manually delete from auth.users in Supabase Console.';
  RAISE NOTICE 'Or run: DELETE FROM auth.users WHERE id = ''%'';', target_user_id;
END $$;
