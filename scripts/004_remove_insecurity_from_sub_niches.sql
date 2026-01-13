-- Migration: Remove insecurity_id from creator_sub_niches
-- This changes sub-niches to be simple names without linking to 4Hs during setup
-- The 4H framework (insecurities) remains available in content planning

-- Drop the foreign key constraint first
ALTER TABLE creator_sub_niches 
DROP CONSTRAINT IF EXISTS creator_sub_niches_insecurity_id_fkey;

-- Remove the insecurity_id column
ALTER TABLE creator_sub_niches 
DROP COLUMN IF EXISTS insecurity_id;

-- Add a comment to document the change
COMMENT ON TABLE creator_sub_niches IS 
'Stores sub-niches for each creator. The 4H framework (human insecurities) is linked to individual content pieces, not sub-niches.';
