// Database types for Atlas

export type WorkspaceType = "personal_creator" | "manager" | "team_agency"
export type UserRole = "owner" | "manager" | "creator" | "editor" | "strategist" | "viewer"
export type ProductionStage = "idea" | "scripted" | "approved" | "shot" | "edited" | "scheduled" | "posted"
export type ContentFormat = "reel" | "post" | "story" | "carousel" | "short" | "long_video"
export type ContentStyle =
  | "talking_head"
  | "skit_dialogue"
  | "transformation"
  | "interview"
  | "b_roll_storytelling"
  | "split_pov"

export interface Workspace {
  id: string
  name: string
  type: WorkspaceType
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Platform {
  id: string
  name: string
  created_at: string
}

export interface ContentPillar {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface FourH {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface HumanInsecurity {
  id: string
  name: string
  created_at: string
}

export interface Creator {
  id: string
  workspace_id: string
  name: string
  brand_name: string | null
  primary_niche: string
  created_at: string
  updated_at: string
}

export interface CreatorSubNiche {
  id: string
  creator_id: string
  sub_niche: string
  created_at: string
}

export interface Series {
  id: string
  creator_id: string
  name: string
  type: string
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  workspace_id: string
  name: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface Content {
  id: string
  creator_id: string
  batch_id: string | null
  series_id: string | null
  episode_number: number | null
  format: ContentFormat
  style: ContentStyle | null
  four_h_id: string | null
  production_stage: ProductionStage
  assigned_to: string | null
  hook: string | null
  opening_visual: string | null
  main_script: string | null
  cta: string | null
  caption: string | null
  hashtags: string | null
  b_roll_notes: string | null
  sound_effects: string | null
  music_reference: string | null
  cadence_pacing: string | null
  shot_list: string | null
  created_at: string
  updated_at: string
}

export interface Research {
  id: string
  workspace_id: string
  platform_id: string
  link: string | null
  creator_niche: string | null
  hook: string | null
  script_breakdown: string | null
  sound_design: string | null
  music: string | null
  cadence: string | null
  b_roll: string | null
  style: string | null
  why_it_worked: string | null
  created_at: string
  updated_at: string
}

export interface Analytics {
  id: string
  content_id: string
  platform_id: string
  views: number | null
  watch_time: number | null
  completion_rate: number | null
  saves: number | null
  shares: number | null
  follows: number | null
  hook_retention: number | null
  drop_off_timestamp: number | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  workspace_id: string
  content_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  google_calendar_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}
