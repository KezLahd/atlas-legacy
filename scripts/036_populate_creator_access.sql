-- Populate creator_access table for existing creators
-- This ensures all creators have proper access records linking them to workspace members

-- For each creator, create an access record for the appropriate workspace member
INSERT INTO creator_access (workspace_member_id, creator_id)
SELECT
  wm.id as workspace_member_id,
  c.id as creator_id
FROM creators c
JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
WHERE wm.role IN ('owner', 'creator', 'manager')
  AND NOT EXISTS (
    SELECT 1 FROM creator_access ca
    WHERE ca.creator_id = c.id AND ca.workspace_member_id = wm.id
  )
  -- For personal creator workspaces, link to owner
  AND (
    (wm.role = 'owner' AND wm.workspace_id IN (
      SELECT id FROM workspaces WHERE type = 'personal_creator'
    ))
    OR
    -- For team/agency workspaces, link creators to appropriate members
    (wm.role IN ('creator', 'manager') AND wm.workspace_id IN (
      SELECT id FROM workspaces WHERE type IN ('manager', 'team_agency')
    ))
  );

-- Ensure at least one access record per creator (fallback for any remaining creators)
INSERT INTO creator_access (workspace_member_id, creator_id)
SELECT
  wm.id as workspace_member_id,
  c.id as creator_id
FROM creators c
CROSS JOIN (
  SELECT wm.* FROM workspace_members wm
  WHERE wm.role = 'owner'
  AND wm.workspace_id IN (SELECT workspace_id FROM creators)
) wm
WHERE wm.workspace_id = c.workspace_id
  AND NOT EXISTS (
    SELECT 1 FROM creator_access ca WHERE ca.creator_id = c.id
  );
