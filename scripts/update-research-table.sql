-- Add new columns to research table
ALTER TABLE research
ADD COLUMN IF NOT EXISTS creator_username text,
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS views integer,
ADD COLUMN IF NOT EXISTS likes integer,
ADD COLUMN IF NOT EXISTS followers integer,
ADD COLUMN IF NOT EXISTS virality_level text,
ADD COLUMN IF NOT EXISTS has_sfx boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_broll boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_music boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS avg_seconds_per_clip numeric,
ADD COLUMN IF NOT EXISTS hook_type text,
ADD COLUMN IF NOT EXISTS content_pillar_id uuid REFERENCES content_pillars(id),
ADD COLUMN IF NOT EXISTS content_style text;

-- Drop old columns that are no longer needed
ALTER TABLE research
DROP COLUMN IF EXISTS creator_niche,
DROP COLUMN IF EXISTS script_breakdown,
DROP COLUMN IF EXISTS sound_design,
DROP COLUMN IF EXISTS music,
DROP COLUMN IF EXISTS cadence,
DROP COLUMN IF EXISTS b_roll,
DROP COLUMN IF EXISTS style,
DROP COLUMN IF EXISTS why_it_worked;

COMMIT;
