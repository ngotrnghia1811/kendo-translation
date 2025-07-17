// === Core domain types matching the Supabase schema ===

export interface Profile {
  id: string
  username: string | null
  role: 'admin' | 'translator' | 'reader'
  email: string | null
  created_at: string
}

export interface Article {
  id: string
  title: string
  content_ja: string | null
  content_en: string | null
  status: string | null
  translation_status: string | null
  quality_score: number | null
  segmented: boolean
  segment_count: number
  created_at: string
  updated_at: string | null
}

export type SegmentStatus = 'draft' | 'translated' | 'reviewed' | 'approved'

export interface Segment {
  id: string
  article_id: string
  position: number
  source_text: string
  target_text: string | null
  source_lang: string
  target_lang: string
  status: SegmentStatus
  locked_by: string | null
  locked_at: string | null
  translated_by: string | null
  reviewed_by: string | null
  quality_score: number | null
  quality_detail: QualityDetail | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface QualityDetail {
  fluency: number
  adequacy: number
  terminology: number
  style: number
}

export interface DocumentSettings {
  id: string
  article_id: string
  source_lang: string
  target_lang: string
  paragraph_boundaries: number[]
  total_segments: number
  translated_count: number
  reviewed_count: number
  approved_count: number
  assigned_translators: string[]
  created_at: string
  updated_at: string
}

export interface SegmentComment {
  id: string
  segment_id: string
  user_id: string
  content: string
  resolved: boolean
  created_at: string
}

export interface SegmentRevision {
  id: string
  segment_id: string
  target_text: string
  edited_by: string | null
  quality_score: number | null
  created_at: string
}

// === Presence types for real-time collaboration ===

export interface UserPresence {
  user_id: string
  username: string
  active_segment: string | null
  color: string
  online_at: string
}

// === API request/response types ===

export interface SegmentUpdateRequest {
  target_text: string
  status?: SegmentStatus
}

export interface SegmentLockRequest {
  segment_id: string
}

export interface SegmentizeRequest {
  source_lang?: string
  target_lang?: string
}

export interface DocumentWithProgress extends Article {
  settings: DocumentSettings | null
  progress: {
    total: number
    translated: number
    reviewed: number
    approved: number
    percentage: number
  }
}
