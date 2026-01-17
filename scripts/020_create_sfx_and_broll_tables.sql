-- Create SFX reference table with common CapCut sound effects
CREATE TABLE IF NOT EXISTS sfx_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'transition', 'impact', 'ambient', 'ui', 'whoosh'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create B-roll reference table for users to manage their b-roll library
CREATE TABLE IF NOT EXISTS broll_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Create junction table for content to SFX (many-to-many)
CREATE TABLE IF NOT EXISTS content_sfx (
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  sfx_id UUID NOT NULL REFERENCES sfx_reference(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, sfx_id)
);

-- Create junction table for content to B-roll (many-to-many)
CREATE TABLE IF NOT EXISTS content_broll (
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  broll_id UUID NOT NULL REFERENCES broll_reference(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, broll_id)
);

-- Insert common CapCut SFX
INSERT INTO sfx_reference (name, category, description) VALUES
  ('Whoosh', 'transition', 'Quick whoosh sound for transitions'),
  ('Pop', 'impact', 'Pop sound for text/graphics appearing'),
  ('Click', 'ui', 'Click sound for buttons and interactions'),
  ('Swoosh', 'transition', 'Swoosh sound for scene changes'),
  ('Impact Hit', 'impact', 'Heavy impact sound'),
  ('Glitch', 'transition', 'Digital glitch effect'),
  ('Boom', 'impact', 'Explosion/boom sound'),
  ('Rising Whoosh', 'transition', 'Rising whoosh for building tension'),
  ('Vinyl Scratch', 'transition', 'Scratch/stop sound'),
  ('Camera Shutter', 'ui', 'Camera shutter click'),
  ('Notification', 'ui', 'Phone notification sound'),
  ('Typing', 'ambient', 'Keyboard typing sound'),
  ('Cash Register', 'impact', 'Money/success sound'),
  ('Heartbeat', 'ambient', 'Heartbeat pulse sound'),
  ('Rewind', 'transition', 'Tape rewind effect')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE sfx_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE broll_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_sfx ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_broll ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SFX (public read, no write - managed by admin)
CREATE POLICY "Anyone can view SFX" ON sfx_reference FOR SELECT USING (true);

-- RLS Policies for B-roll
CREATE POLICY "Users can view workspace B-roll" ON broll_reference FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage B-roll" ON broll_reference FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'editor')
    )
  );

-- RLS Policies for content_sfx
CREATE POLICY "Users can view content SFX" ON content_sfx FOR SELECT
  USING (
    content_id IN (
      SELECT c.id FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      JOIN workspace_members wm ON cr.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage content SFX" ON content_sfx FOR ALL
  USING (
    content_id IN (
      SELECT c.id FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      JOIN workspace_members wm ON cr.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager', 'editor', 'creator')
    )
  );

-- RLS Policies for content_broll
CREATE POLICY "Users can view content B-roll" ON content_broll FOR SELECT
  USING (
    content_id IN (
      SELECT c.id FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      JOIN workspace_members wm ON cr.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage content B-roll" ON content_broll FOR ALL
  USING (
    content_id IN (
      SELECT c.id FROM content c
      JOIN creators cr ON c.creator_id = cr.id
      JOIN workspace_members wm ON cr.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'manager', 'editor', 'creator')
    )
  );
