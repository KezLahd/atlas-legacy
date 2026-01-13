-- Add posting frequency framework table
CREATE TABLE creator_posting_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  posting_frequency INT NOT NULL CHECK (posting_frequency >= 3 AND posting_frequency <= 7),
  excluded_day_types INT[] DEFAULT '{}', -- Array of day numbers to exclude (1-7)
  content_type_order INT[] DEFAULT '{1,2,3,4,5,6,7}', -- Added custom content type order
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id)
);

-- Add day_number column to content table to track which framework day the content is for
ALTER TABLE content ADD COLUMN day_number INT CHECK (day_number >= 1 AND day_number <= 7);

-- Create index for efficient queries
CREATE INDEX idx_creator_posting_frameworks_creator ON creator_posting_frameworks(creator_id);
CREATE INDEX idx_content_day_number ON content(day_number);

-- Enable RLS
ALTER TABLE creator_posting_frameworks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for creator_posting_frameworks
CREATE POLICY "Users can view frameworks for their workspace creators" ON creator_posting_frameworks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspaces w ON c.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE c.id = creator_posting_frameworks.creator_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can insert frameworks" ON creator_posting_frameworks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspaces w ON c.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE c.id = creator_posting_frameworks.creator_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can update frameworks" ON creator_posting_frameworks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM creators c
      JOIN workspaces w ON c.workspace_id = w.id
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE c.id = creator_posting_frameworks.creator_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'manager')
    )
  );
