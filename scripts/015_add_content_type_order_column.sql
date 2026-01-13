-- Add content_type_order column to creator_posting_frameworks table
-- This allows users to customize the order of content types through drag-and-drop

ALTER TABLE creator_posting_frameworks
ADD COLUMN IF NOT EXISTS content_type_order INT[] DEFAULT '{1,2,3,4,5,6,7}';

COMMENT ON COLUMN creator_posting_frameworks.content_type_order IS 'Custom order of content types (1-7) as arranged by the user through drag-and-drop';
