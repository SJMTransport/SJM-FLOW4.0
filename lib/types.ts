// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

export interface Account {
  id: string
  name: string
  handle: string
  platform: string
  avatar_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

// ─── SERIES ──────────────────────────────────────────────────────────────────

export interface Series {
  id: string
  account_id: string
  title: string
  description?: string
  cover_url?: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  created_at: string
  updated_at: string
}

// ─── CONTENT ─────────────────────────────────────────────────────────────────

export interface Content {
  id: string
  account_id: string
  series_id?: string
  title: string
  body?: string
  stage: string
  platforms: string[]
  word_count?: number
  published_at?: string
  created_at: string
  updated_at: string
}

// ─── DISTRIBUTION ────────────────────────────────────────────────────────────

export interface Distribution {
  id: string
  content_id: string
  platform: string
  url?: string
  status: 'pending' | 'published' | 'failed'
  published_at?: string
  created_at: string
}

// ─── PERFORMANCE ─────────────────────────────────────────────────────────────

export interface Performance {
  id: string
  content_id: string
  distribution_id?: string
  platform: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  reach?: number
  recorded_at: string
}

// ─── REF ITEM ────────────────────────────────────────────────────────────────

export interface RefItem {
  id: string
  category: string
  value: string
  label: string
  color?: string
  sort_order?: number
}

// ─── STAGE LOG ───────────────────────────────────────────────────────────────

export interface StageLog {
  id: string
  content_id: string
  from_stage?: string
  to_stage: string
  notes?: string
  created_by?: string
  created_at: string
}

// ─── SCRIPT TEMPLATE ─────────────────────────────────────────────────────────

export interface ScriptTemplate {
  id: string
  account_id?: string
  title: string
  description?: string
  body: string
  platform?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

// ─── IDEA ────────────────────────────────────────────────────────────────────

export interface Idea {
  id: string
  account_id?: string
  series_id?: string
  title: string
  description?: string
  platform?: string
  status: 'new' | 'approved' | 'rejected' | 'converted'
  created_at: string
  updated_at: string
}

// ─── MEDIA ASSET ─────────────────────────────────────────────────────────────

export interface MediaAsset {
  id: string
  content_id?: string
  account_id?: string
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'document' | 'other'
  size?: number
  mime_type?: string
  created_at: string
}
