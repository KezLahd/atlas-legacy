-- Create a static reference table for the @jun_yuh 7-Day Content Operating System
CREATE TABLE IF NOT EXISTS content_types (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 7 content types from the @jun_yuh framework
INSERT INTO content_types (id, name, description, icon) VALUES
  (1, 'Storytelling', 'Challenge → timestamps → readable text → rising sound. Themes: big goal, struggle, breakthrough, hero''s journey. Medium effort, 30–45s', '📖'),
  (2, 'Behind the Scenes', 'Talking to camera + montage. High effort, 45–60s. Focus on process and reality', '🎬'),
  (3, 'Education', 'One framework, one takeaway. Low effort, 30–60s. Educational, repeatable', '📚'),
  (4, 'Entertainment', 'Use trend mechanics. Insert creator''s philosophy or brand POV', '🎥'),
  (5, 'Inspiration', 'Framework, system, checklist, mistake, do/don''t. Medium effort, authority-building', '💡'),
  (6, 'Trust', 'Gratitude, reflection, FAQs, or Do vs Don''t. Low effort, high trust', '🤝'),
  (7, 'Depth', 'Mini-lesson, vlog, testimonial, case study. Builds loyal audience', '🔍')
ON CONFLICT (id) DO NOTHING;
