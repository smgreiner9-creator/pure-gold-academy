'use client'

interface Review {
  id: string
  rating: number
  review_text: string | null
  teacher_response: string | null
  created_at: string
  student?: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="material-symbols-outlined"
          style={{
            color: star <= rating ? 'var(--gold)' : 'var(--muted)',
            fontSize: '16px',
          }}
        >
          star
        </span>
      ))}
    </span>
  )
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function TeacherProfileClient({
  reviews,
}: {
  reviews: Review[]
}) {
  if (reviews.length === 0) {
    return (
      <div className="p-8 rounded-2xl glass-surface text-center">
        <span className="material-symbols-outlined text-3xl text-[var(--muted)] mb-2 block">
          rate_review
        </span>
        <p className="text-[var(--muted)] text-sm">
          No reviews yet. Be the first to leave a review after joining a classroom!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="p-5 rounded-2xl glass-surface"
        >
          <div className="flex items-center gap-3 mb-3">
            {review.student?.avatar_url ? (
              <img
                src={review.student.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                <span className="text-[var(--gold)] text-xs font-bold">
                  {getInitials(review.student?.display_name || null)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {review.student?.display_name || 'Student'}
              </p>
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} />
                <span className="text-xs text-[var(--muted)]">
                  {formatDate(review.created_at)}
                </span>
              </div>
            </div>
          </div>

          {review.review_text && (
            <p className="text-sm text-[var(--muted)] mb-3">
              {review.review_text}
            </p>
          )}

          {review.teacher_response && (
            <div className="mt-3 pl-4 border-l-2 border-[var(--gold)]/30">
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">
                Teacher Response
              </p>
              <p className="text-sm">{review.teacher_response}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
