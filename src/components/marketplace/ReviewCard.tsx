'use client'

import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

export interface ReviewCardProps {
  review: {
    id: string
    rating: number
    review_text: string | null
    teacher_response: string | null
    created_at: string
    student?: {
      display_name: string | null
      avatar_url: string | null
    }
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`material-symbols-outlined text-[16px] ${
            i <= rating ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
          }`}
          style={i <= rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const displayName = review.student?.display_name || 'Anonymous'
  const relativeDate = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
  })

  return (
    <div className="rounded-xl glass-surface p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {review.student?.avatar_url ? (
          <Image
            src={review.student.avatar_url}
            alt={displayName}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--gold)]/15 flex items-center justify-center">
            <span className="text-xs font-bold text-[var(--gold)]">
              {getInitials(review.student?.display_name)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[var(--foreground)] truncate">
              {displayName}
            </span>
            <span className="text-xs text-[var(--muted)]">{relativeDate}</span>
          </div>
          <StarRating rating={review.rating} />
        </div>
      </div>

      {/* Review text */}
      {review.review_text && (
        <p className="text-sm text-[var(--foreground)] leading-relaxed mb-3">
          {review.review_text}
        </p>
      )}

      {/* Teacher response */}
      {review.teacher_response && (
        <div className="ml-2 pl-4 border-l-2 border-[var(--gold)] rounded-r-lg bg-[var(--gold)]/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="material-symbols-outlined text-[14px] text-[var(--gold)]">
              school
            </span>
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
              Teacher Response
            </span>
          </div>
          <p className="text-sm text-[var(--foreground)] leading-relaxed">
            {review.teacher_response}
          </p>
        </div>
      )}
    </div>
  )
}
