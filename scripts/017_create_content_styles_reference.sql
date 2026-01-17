-- Content Styles Reference Table
-- Maps content styles to specific pillars

CREATE TABLE content_styles_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id UUID NOT NULL REFERENCES content_pillars(id) ON DELETE CASCADE,
  style_name TEXT NOT NULL,
  style_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pillar_id, style_value)
);

-- Enable RLS
ALTER TABLE content_styles_reference ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Content styles are viewable by everyone"
  ON content_styles_reference FOR SELECT
  USING (true);

-- Insert Educational pillar styles (the current 6 styles)
INSERT INTO content_styles_reference (pillar_id, style_name, style_value, description)
SELECT 
  cp.id,
  style_data.name,
  style_data.value,
  style_data.description
FROM content_pillars cp
CROSS JOIN (
  VALUES
    ('Talking Head', 'talking_head', 'Direct to camera, speaking directly to audience'),
    ('B-roll with Voiceover', 'b_roll_voiceover', 'Voiceover narration over relevant footage'),
    ('Interview', 'interview', 'Q&A format with interviewer and subject'),
    ('Before/After Transformation', 'transformation', 'Showing transformation or results'),
    ('Screen Recording Tutorial', 'screen_recording', 'Tutorial with screen capture'),
    ('Demonstration', 'demonstration', 'Step-by-step demonstration of a process')
) AS style_data(name, value, description)
WHERE cp.name = 'Educational';

-- Insert Storytelling pillar styles (3 styles)
INSERT INTO content_styles_reference (pillar_id, style_name, style_value, description)
SELECT 
  cp.id,
  style_data.name,
  style_data.value,
  style_data.description
FROM content_pillars cp
CROSS JOIN (
  VALUES
    ('Voiceover', 'voiceover', 'Story told through voiceover narration'),
    ('Shot/Angle Change', 'shot_angle_change', 'Story told through varying camera shots and angles'),
    ('Audio + B-roll + Text', 'audio_broll_text', 'Combination of audio, b-roll footage, and on-screen text')
) AS style_data(name, value, description)
WHERE cp.name = 'Storytelling';

-- Storytelling Formats Reference Table
-- The 7 storytelling types/formats
CREATE TABLE storytelling_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE storytelling_formats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Storytelling formats are viewable by everyone"
  ON storytelling_formats FOR SELECT
  USING (true);

-- Insert the 7 storytelling formats
INSERT INTO storytelling_formats (name, description) VALUES 
  ('Big Goal', 'Content about pursuing a significant goal'),
  ('Change', 'Content about making or experiencing change'),
  ('Transformation', 'Content showing personal transformation'),
  ('Lesson', 'Content sharing a valuable lesson learned'),
  ('Loss', 'Content about experiencing loss or setback'),
  ('Win', 'Content celebrating a victory or achievement'),
  ('My Story', 'Personal narrative content');

-- Add storytelling_format_id to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS storytelling_format_id UUID REFERENCES storytelling_formats(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_content_storytelling_format ON content(storytelling_format_id);

-- Note: Authority pillar styles to be added later after research
-- Note: Series pillar does not use content styles (uses series field instead)
-- Note: Double Down pillar will reference existing content pieces as templates
