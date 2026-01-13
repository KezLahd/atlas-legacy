-- Remove insecurity requirement from creator_sub_niches
-- Make insecurity_id nullable since we removed it from onboarding
ALTER TABLE creator_sub_niches ALTER COLUMN insecurity_id DROP NOT NULL;
