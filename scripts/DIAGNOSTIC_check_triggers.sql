-- Check for ALL triggers in the database that might reference 'creators'
SELECT 
  trigger_schema,
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%creators%'
   OR (event_object_schema = 'auth' AND event_object_table = 'users')
ORDER BY trigger_schema, trigger_name;

-- Also check for stored functions/procedures that reference creators
SELECT 
  routine_schema,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%creators%'
   OR routine_definition LIKE '%cascade%'
ORDER BY routine_schema, routine_name;
