-- Add content_type_id column to content table to link content to framework days
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS content_type_id INT REFERENCES content_types(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_content_content_type_id ON content(content_type_id);

-- Add comment explaining the column
COMMENT ON COLUMN content.content_type_id IS 'Links content to @jun_yuh 7-day framework day (1=Storytelling, 2=Behind the Scenes, etc.)';
