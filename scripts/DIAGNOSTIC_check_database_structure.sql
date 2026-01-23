-- DIAGNOSTIC SCRIPT: Check database structure and foreign key constraints
-- Run this in Supabase SQL Editor to see what's actually configured

-- 1. List all tables in public schema
SELECT '=== ALL TABLES IN PUBLIC SCHEMA ===' as section;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. List all foreign key constraints that reference auth.users
SELECT '=== FOREIGN KEYS REFERENCING auth.users ===' as section;
SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users'
ORDER BY tc.table_schema, tc.table_name;

-- 3. Show the actual constraint definitions (the SQL that creates them)
SELECT '=== ACTUAL CONSTRAINT SQL DEFINITIONS ===' as section;
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE contype = 'f'  -- foreign key constraints
    AND confrelid = 'auth.users'::regclass
ORDER BY conrelid::regclass::text;

-- 4. Check if creators table exists and its schema
SELECT '=== CREATORS TABLE INFORMATION ===' as section;
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'creators';

-- 5. Check columns in creators table
SELECT '=== CREATORS TABLE COLUMNS ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'creators'
ORDER BY ordinal_position;
