-- Delete all references to user aa4c17aa-f3a1-41a8-a292-7d9c7364a833 from Atlas database
-- Run this script in your Supabase SQL Editor for the Atlas project

DO $$
DECLARE
    user_to_delete UUID := 'aa4c17aa-f3a1-41a8-a292-7d9c7364a833';
    row_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting cleanup for user: %', user_to_delete;
    
    -- Step 1: Delete from creators table
    SELECT COUNT(*) INTO row_count FROM creators WHERE user_id = user_to_delete;
    IF row_count > 0 THEN
        RAISE NOTICE 'Deleting % rows from creators', row_count;
        DELETE FROM creators WHERE user_id = user_to_delete;
    ELSE
        RAISE NOTICE 'No rows found in creators';
    END IF;
    
    -- Step 2: Delete from workspace_members table
    SELECT COUNT(*) INTO row_count FROM workspace_members WHERE user_id = user_to_delete;
    IF row_count > 0 THEN
        RAISE NOTICE 'Deleting % rows from workspace_members', row_count;
        DELETE FROM workspace_members WHERE user_id = user_to_delete;
    ELSE
        RAISE NOTICE 'No rows found in workspace_members';
    END IF;
    
    -- Step 3: Delete from user_profiles table
    SELECT COUNT(*) INTO row_count FROM user_profiles WHERE id = user_to_delete;
    IF row_count > 0 THEN
        RAISE NOTICE 'Deleting % rows from user_profiles', row_count;
        DELETE FROM user_profiles WHERE id = user_to_delete;
    ELSE
        RAISE NOTICE 'No rows found in user_profiles';
    END IF;
    
    -- Step 4: NULL out content table references (preserve content)
    UPDATE content SET assigned_to = NULL WHERE assigned_to = user_to_delete;
    UPDATE content SET created_by = NULL WHERE created_by = user_to_delete;
    UPDATE content SET updated_by = NULL WHERE updated_by = user_to_delete;
    RAISE NOTICE 'Nullified content references';
    
    -- Step 5: Delete or NULL calendar_events
    DELETE FROM calendar_events WHERE created_by = user_to_delete;
    UPDATE calendar_events SET assigned_to = NULL WHERE assigned_to = user_to_delete;
    RAISE NOTICE 'Cleaned up calendar_events';
    
    -- Step 6: Delete from event_team_members
    DELETE FROM event_team_members WHERE user_id = user_to_delete;
    RAISE NOTICE 'Cleaned up event_team_members';
    
    -- Step 7: Delete audit logs
    DELETE FROM content_audit_log WHERE user_id = user_to_delete;
    DELETE FROM research_audit_log WHERE user_id = user_to_delete;
    DELETE FROM script_audit_log WHERE user_id = user_to_delete;
    DELETE FROM event_audit_log WHERE user_id = user_to_delete;
    RAISE NOTICE 'Deleted audit logs';
    
    -- Step 8: Delete from event_completion_tracking
    DELETE FROM event_completion_tracking WHERE user_id = user_to_delete;
    RAISE NOTICE 'Cleaned up event_completion_tracking';
    
    -- Step 9: NULL out research references
    UPDATE research SET created_by = NULL WHERE created_by = user_to_delete;
    UPDATE research SET updated_by = NULL WHERE updated_by = user_to_delete;
    RAISE NOTICE 'Nullified research references';
    
    -- Step 10: NULL out broll and sfx references
    UPDATE broll_reference SET user_id = NULL WHERE user_id = user_to_delete;
    UPDATE sfx_reference SET user_id = NULL WHERE user_id = user_to_delete;
    RAISE NOTICE 'Nullified broll and sfx references';
    
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
    RAISE NOTICE 'All public schema references have been cleaned up.';
    RAISE NOTICE 'You can now safely delete the user from auth.users using Supabase Auth Admin.';
END $$;
