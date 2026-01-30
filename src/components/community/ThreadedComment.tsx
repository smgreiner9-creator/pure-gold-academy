'use client'

import { useState } from 'react'
import VoteButton from './VoteButton'
import type { CommunityComment, Profile } from '@/types/database'

export type CommentWithMeta = CommunityComment & {
  author?: Profile
  children?: CommentWithMeta[]
  score: number
  userVote: 1 | -1 | null
}

interface ThreadedCommentProps {
  comment: CommentWithMeta
  depth: number
  onReply: (parentCommentId: string, content: string) => Promise<void>
  onVote: (commentId: string, voteType: 1 | -1) => void
  onDelete?: (commentId: string) => void
  currentUserId?: string
}

const MAX_DEPTH = 3

export default function ThreadedComment({
  comment,
  depth,
  onReply,
  onVote,
  onDelete,
  currentUserId,
}: ThreadedCommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    setIsSubmitting(true)
    try {
      await onReply(comment.id, replyContent.trim())
      setReplyContent('')
      setShowReplyForm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const isOwner = currentUserId === comment.user_id

  return (
    <div className={depth > 0 ? 'ml-6 pl-4 border-l-2 border-[var(--glass-surface-border)]' : ''}>
      <div className="flex gap-3 py-3">
        {/* Vote */}
        <VoteButton
          score={comment.score}
          userVote={comment.userVote}
          onVote={(voteType) => onVote(comment.id, voteType)}
          size="sm"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="w-6 h-6 rounded-lg bg-[var(--gold)] flex items-center justify-center text-black font-bold text-xs shrink-0">
              {comment.author?.display_name?.[0] || 'U'}
            </div>
            <span className="font-semibold text-sm">
              {comment.author?.display_name || comment.author?.email || 'User'}
            </span>
            {comment.author?.role === 'teacher' && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                Teacher
              </span>
            )}
            <span className="text-xs text-[var(--muted)]">{formatDate(comment.created_at)}</span>
          </div>

          <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>

          <div className="flex items-center gap-3">
            {depth < MAX_DEPTH && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--gold)] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">reply</span>
                Reply
              </button>
            )}
            {isOwner && onDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-3 space-y-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full input-field rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors min-h-[80px] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowReplyForm(false)
                    setReplyContent('')
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold gold-gradient text-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : (
                    'Reply'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Child comments */}
      {comment.children && comment.children.length > 0 && (
        <div>
          {comment.children.map((child) => (
            <ThreadedComment
              key={child.id}
              comment={child}
              depth={depth + 1}
              onReply={onReply}
              onVote={onVote}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
