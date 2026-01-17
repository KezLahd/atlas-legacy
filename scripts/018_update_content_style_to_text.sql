-- Update content_style from enum to TEXT to allow flexible style definitions
-- This allows us to use the content_styles_reference table for pillar-specific styles

-- Drop the old enum constraint and convert to TEXT
ALTER TABLE content DROP COLUMN IF EXISTS style;
ALTER TABLE content ADD COLUMN style TEXT;

-- Drop the old enum type
DROP TYPE IF EXISTS content_style CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_content_style ON content(style);

-- Add comment
COMMENT ON COLUMN content.style IS 'Content style from content_styles_reference table (style_value column)';
