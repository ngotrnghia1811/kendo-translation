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

export type SegmentStatus =
  | 'draft'
  | 'translated'
  | 'edited'
  | 'proofread'
  | 'qa_approved'

/** Internal workflow phase a user can be assigned to per document. */
export type WorkflowPhase = 'translate' | 'edit' | 'proofread' | 'qa'

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
  parent_comment_id: string | null
  mentions: string[]
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

// === Migration 004 / Contract v1.2 cooperation tables ===

export interface DocumentAssignment {
  id: string
  user_id: string
  document_id: string
  allowed_phases: WorkflowPhase[]
  assigned_by: string | null
  created_at: string
  updated_at: string
}

export interface SegmentPhaseTransition {
  id: string
  segment_id: string
  from_status: SegmentStatus | string
  to_status: SegmentStatus | string
  actor_id: string | null
  acknowledged_minor: boolean
  note: string | null
  created_at: string
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'superseded'
export type AuthorKind = 'human' | 'agent'

export interface SegmentSuggestion {
  id: string
  segment_id: string
  suggester_id: string
  suggester_kind: AuthorKind
  proposed_text: string
  status: SuggestionStatus
  accepter_id: string | null
  accepted_at: string | null
  created_at: string
}

export type QAIssueCategory =
  | 'Mistranslation'
  | 'Terminology'
  | 'Register/Keigo'
  | 'Fluency'
  | 'Cultural-adaptation'
  | 'Omission/Addition'
  | 'Style'

export type QAIssueSeverity = 'minor' | 'major' | 'critical'

export interface QAIssue {
  id: string
  segment_id: string
  category: QAIssueCategory
  severity: QAIssueSeverity
  char_start: number | null
  char_end: number | null
  body: string | null
  author_id: string | null
  author_kind: AuthorKind
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}
