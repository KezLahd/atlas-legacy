-- Add research_id column to content table to link content back to research
ALTER TABLE content
ADD COLUMN IF NOT EXISTS research_id UUID REFERENCES research(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_research_id ON content(research_id);

COMMIT;
