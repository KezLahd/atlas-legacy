-- Fix any remaining foreign key constraints that might be blocking auth.users deletion
-- This handles tables that were created in later migrations

-- Check and fix creators.user_id if needed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'creators_user_id_fkey' 
        AND table_name = 'creators'
    ) THEN
        ALTER TABLE creators DROP CONSTRAINT creators_user_id_fkey;
        ALTER TABLE creators ADD CONSTRAINT creators_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make sure workspace_members has proper CASCADE
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'workspace_members_user_id_fkey' 
        AND table_name = 'workspace_members'
    ) THEN
        ALTER TABLE workspace_members DROP CONSTRAINT workspace_members_user_id_fkey;
        ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make sure user_profiles has proper CASCADE
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_id_fkey' 
        AND table_name = 'user_profiles'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_id_fkey;
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_id_fkey 
          FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;
