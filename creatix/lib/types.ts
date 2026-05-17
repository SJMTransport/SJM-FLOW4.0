export type Platform = "instagram" | "tiktok" | "threads" | "youtube" | "shopee";
export type ContentType = "video" | "carousel" | "thread" | "short" | "live";
export type ContentStage =
  | "idea"
  | "scripting"
  | "recording"
  | "editing"
  | "scheduling"
  | "published"
  | "reviewed";
export type DistributionStatus = "draft" | "scheduled" | "posted" | "failed";
export type IdeaStatus = "raw" | "developed" | "converted" | "dismissed";
export type SeriesStatus = "ongoing" | "completed" | "hiatus";
export type RefStatus = "saved" | "used" | "archived";
export type Mood =
  | "educational"
  | "entertaining"
  | "promotional"
  | "personal"
  | "inspirational";

export interface Account {
  id: string;
  platform: Platform;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_active: boolean;
  weekly_target: number;
  created_at: string;
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  status: SeriesStatus;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  content_type: ContentType;
  script?: string;
  idea_notes?: string;
  status: string;
  stage: ContentStage;
  stage_updated_at: string;
  mood?: Mood;
  tags: string[];
  thumbnail_url?: string;
  series_id?: string;
  series_order?: number;
  created_at: string;
  series?: Series;
}

export interface Distribution {
  id: string;
  content_id: string;
  account_id: string;
  status: DistributionStatus;
  caption?: string;
  scheduled_at?: string;
  posted_at?: string;
  post_url?: string;
  is_repurposed: boolean;
  repurpose_notes?: string;
  notes?: string;
  created_at: string;
  account?: Account;
  content?: Content;
}

export interface Performance {
  id: string;
  distribution_id: string;
  recorded_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers_gained: number;
  extra_metrics: Record<string, number>;
  notes?: string;
}

export interface RefItem {
  id: string;
  content_id?: string;
  url: string;
  title?: string;
  notes?: string;
  platform?: string;
  status: RefStatus;
  tags: string[];
  created_at: string;
}

export interface StageLog {
  id: string;
  content_id: string;
  stage: ContentStage;
  notes?: string;
  entered_at: string;
}

export interface ScriptTemplate {
  id: string;
  title: string;
  content_type?: ContentType;
  structure?: string;
  created_at: string;
}

export interface Idea {
  id: string;
  body: string;
  source: string;
  status: IdeaStatus;
  content_id?: string;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  content_id?: string;
  url: string;
  label?: string;
  type: string;
  created_at: string;
}
