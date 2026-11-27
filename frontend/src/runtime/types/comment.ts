import type { ReactionSummary } from './reaction'

export interface CommunityComment {
  id: number
  parent_id: number | null
  author_id: number | null
  author_name: string
  is_deleted_author: boolean
  body_html: string
  is_team: boolean
  edited_at: string | null
  created_at: string
  replies: CommunityComment[]
  reactions: ReactionSummary
  status: string
  moderation_reason: string
  can_edit: boolean
  raw_markdown: string
}

export interface CreateCommentPayload {
  thread_slug: string
  body_markdown: string
  parent_id?: number | null
  guest_name?: string
  altcha?: string
  website?: string
}
