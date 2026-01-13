-- RLS Policies for Atlas

-- Helper function to check if user is member of workspace
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check workspace role
CREATE OR REPLACE FUNCTION get_workspace_role(workspace_uuid UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM workspace_members
  WHERE workspace_id = workspace_uuid
  AND user_id = auth.uid();
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workspaces policies
CREATE POLICY "Workspace members can view their workspaces" ON workspaces
  FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "Workspace owners can update workspaces" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

CREATE POLICY "Authenticated users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace members policies
CREATE POLICY "Workspace members can view members" ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Workspace owners and managers can insert members" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Workspace owners and managers can update members" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Workspace owners and managers can delete members" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
  );

-- Platforms, pillars, 4Hs, insecurities - read-only for all authenticated users
CREATE POLICY "Anyone authenticated can view platforms" ON platforms
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view pillars" ON content_pillars
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view 4Hs" ON four_hs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can view insecurities" ON human_insecurities
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Creators policies
CREATE POLICY "Workspace members can view creators" ON creators
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Workspace owners and managers can manage creators" ON creators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = creators.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
  );

-- Creator sub-niches policies
CREATE POLICY "View creator sub-niches if workspace member" ON creator_sub_niches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage creator sub-niches if owner/manager" ON creator_sub_niches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager')
    )
  );

-- Creator platforms policies
CREATE POLICY "View creator platforms if workspace member" ON creator_platforms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage creator platforms if owner/manager" ON creator_platforms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager')
    )
  );

-- Creator access policies
CREATE POLICY "View creator access if workspace member" ON creator_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN creators c ON c.id = creator_id
      WHERE wm.id = workspace_member_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage creator access if owner/manager" ON creator_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN creators c ON c.id = creator_id
      WHERE wm.workspace_id = c.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager')
    )
  );

-- Series policies
CREATE POLICY "View series if workspace member" ON series
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage series if workspace member with access" ON series
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Batches policies
CREATE POLICY "View batches if workspace member" ON batches
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Manage batches if owner/manager" ON batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = batches.workspace_id AND user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Batch creators policies
CREATE POLICY "View batch creators if workspace member" ON batch_creators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM batches b
      WHERE b.id = batch_id AND is_workspace_member(b.workspace_id)
    )
  );

CREATE POLICY "Manage batch creators if owner/manager" ON batch_creators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM batches b
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
      WHERE b.id = batch_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager')
    )
  );

-- Content policies
CREATE POLICY "View content if workspace member" ON content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage content if contributor" ON content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = creator_id AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Content platforms policies
CREATE POLICY "View content platforms if workspace member" ON content_platforms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content co
      JOIN creators c ON c.id = co.creator_id
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE co.id = content_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage content platforms if contributor" ON content_platforms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content co
      JOIN creators c ON c.id = co.creator_id
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE co.id = content_id AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Content pillars junction policies
CREATE POLICY "View content pillars if workspace member" ON content_content_pillars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content co
      JOIN creators c ON c.id = co.creator_id
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE co.id = content_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage content pillars if contributor" ON content_content_pillars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content co
      JOIN creators c ON c.id = co.creator_id
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE co.id = content_id AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Research policies
CREATE POLICY "View research if workspace member" ON research
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Manage research if contributor" ON research
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = research.workspace_id AND user_id = auth.uid() 
      AND role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Analytics policies
CREATE POLICY "View analytics if workspace member" ON analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content co
      JOIN creators c ON c.id = co.creator_id
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE co.id = content_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Manage analytics if contributor" ON analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content co
      JOIN creators c ON c.id = co.creator_id
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE co.id = content_id AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Calendar events policies
CREATE POLICY "View calendar events if workspace member" ON calendar_events
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Manage calendar events if contributor" ON calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = calendar_events.workspace_id AND user_id = auth.uid() 
      AND role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );

-- Calendar invitees policies
CREATE POLICY "View calendar invitees if workspace member" ON calendar_invitees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = event_id AND is_workspace_member(ce.workspace_id)
    )
  );

CREATE POLICY "Manage calendar invitees if contributor" ON calendar_invitees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      JOIN workspace_members wm ON wm.workspace_id = ce.workspace_id
      WHERE ce.id = event_id AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'manager', 'creator', 'editor', 'strategist')
    )
  );
