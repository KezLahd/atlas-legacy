-- Add content_id column to brainstorms table
ALTER TABLE brainstorms 
ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES content(id) ON DELETE SET NULL;

-- Create index for faster queries on content_id
CREATE INDEX IF NOT EXISTS idx_brainstorms_content_id ON brainstorms(content_id) WHERE content_id IS NOT NULL;
