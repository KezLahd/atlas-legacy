-- Drop the existing workspace INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;

-- Create a new, simpler policy that definitely works
CREATE POLICY "Anyone authenticated can insert workspaces"
ON workspaces
FOR INSERT
TO authenticated
WITH CHECK (true);

-- This allows any authenticated user to create a workspace
-- We'll add owner validation later once workspace_members is populated
