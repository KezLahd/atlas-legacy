-- Create enum types for Atlas
CREATE TYPE workspace_type AS ENUM ('personal_creator', 'manager', 'team_agency');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'creator', 'editor', 'strategist', 'viewer');
CREATE TYPE production_stage AS ENUM ('idea', 'scripted', 'approved', 'shot', 'edited', 'scheduled', 'posted');
CREATE TYPE content_format AS ENUM ('reel', 'post', 'story', 'carousel', 'short', 'long_video');
CREATE TYPE content_style AS ENUM ('talking_head', 'skit_dialogue', 'transformation', 'interview', 'b_roll_storytelling', 'split_pov');

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type workspace_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members (links users to workspaces with roles)
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Platforms table (not hardcoded)
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platforms
INSERT INTO platforms (name) VALUES 
  ('Instagram'),
  ('TikTok'),
  ('YouTube Shorts'),
  ('YouTube Long'),
  ('Facebook'),
  ('X'),
  ('LinkedIn');

-- Content Pillars table (not hardcoded)
CREATE TABLE content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pillars
INSERT INTO content_pillars (name, description) VALUES 
  ('Educational', 'Teaching and informing your audience'),
  ('Storytelling', 'Sharing narratives and experiences'),
  ('Authority', 'Establishing credibility and expertise'),
  ('Series', 'Episodic content with continuity'),
  ('Double Down', 'Amplifying what works');

-- 4Hs table (not hardcoded)
CREATE TABLE four_hs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default 4Hs
INSERT INTO four_hs (name, description) VALUES 
  ('Heard', 'Trending topics and conversations'),
  ('Helpful', 'Practical advice and solutions'),
  ('Humour', 'Entertainment and comedy'),
  ('Happenings', 'Current events and news');

-- Human Insecurities table
CREATE TABLE human_insecurities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default insecurities
INSERT INTO human_insecurities (name) VALUES 
  ('Money'),
  ('Status'),
  ('Body'),
  ('Relationships'),
  ('Time'),
  ('Health'),
  ('Career'),
  ('Identity');

-- Creators table
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_name TEXT,
  primary_niche TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator sub-niches (up to 5 per creator)
CREATE TABLE creator_sub_niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  sub_niche TEXT NOT NULL,
  insecurity_id UUID NOT NULL REFERENCES human_insecurities(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator platforms (many-to-many)
CREATE TABLE creator_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, platform_id)
);

-- Creator access (which users can access which creators)
CREATE TABLE creator_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_member_id UUID NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_member_id, creator_id)
);

-- Series table
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- progress, daily_update, goal_based, custom
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batches table
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch creators (many-to-many)
CREATE TABLE batch_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_id, creator_id)
);

-- Content table
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  series_id UUID REFERENCES series(id) ON DELETE SET NULL,
  episode_number INT,
  format content_format NOT NULL,
  style content_style,
  four_h_id UUID REFERENCES four_hs(id),
  production_stage production_stage DEFAULT 'idea',
  assigned_to UUID REFERENCES auth.users(id),
  hook TEXT,
  opening_visual TEXT,
  main_script TEXT,
  cta TEXT,
  caption TEXT,
  hashtags TEXT,
  b_roll_notes TEXT,
  sound_effects TEXT,
  music_reference TEXT,
  cadence_pacing TEXT,
  shot_list TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content platforms (many-to-many)
CREATE TABLE content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, platform_id)
);

-- Content pillars (many-to-many)
CREATE TABLE content_content_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  pillar_id UUID NOT NULL REFERENCES content_pillars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, pillar_id)
);

-- Research table
CREATE TABLE research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id),
  link TEXT,
  creator_niche TEXT,
  hook TEXT,
  script_breakdown TEXT,
  sound_design TEXT,
  music TEXT,
  cadence TEXT,
  b_roll TEXT,
  style TEXT,
  why_it_worked TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table (manual first, API later)
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id),
  views INT,
  watch_time INT, -- in seconds
  completion_rate DECIMAL(5,2), -- percentage
  saves INT,
  shares INT,
  follows INT,
  hook_retention DECIMAL(5,2), -- percentage
  drop_off_timestamp INT, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, platform_id)
);

-- Calendar events table
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  google_calendar_id TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar invitees table
CREATE TABLE calendar_invitees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, email)
);

-- User profiles table (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE four_hs ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_insecurities ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_sub_niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE research ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_invitees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_creators_workspace ON creators(workspace_id);
CREATE INDEX idx_content_creator ON content(creator_id);
CREATE INDEX idx_content_batch ON content(batch_id);
CREATE INDEX idx_content_stage ON content(production_stage);
CREATE INDEX idx_calendar_events_workspace ON calendar_events(workspace_id);
CREATE INDEX idx_research_workspace ON research(workspace_id);
