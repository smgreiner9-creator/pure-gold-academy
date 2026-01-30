'use client'

import { useState } from 'react'

export interface ReviewFormProps {
  classroomId: string
  existingReview?: {
    id: string
    rating: number
    review_text: string | null
  } | null
  onSubmitted?: () => void
}

function StarSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number) => void
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= (hovered || value)
        return (
          <button
            key={i}
            type="button"
            className={`material-symbols-outlined text-[28px] transition-colors cursor-pointer ${
              filled ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
            }`}
            style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
            onMouseEnter={() => setHovered(i)}
            onClick={() => onChange(i)}
            aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
          >
            star
          </button>
        )
      })}
      {value > 0 && (
        <span className="text-sm text-[var(--muted)] ml-2">
          {value}/5
        </span>
      )}
    </div>
  )
}

export default function ReviewForm({
  classroomId,
  existingReview,
  onSubmitted,
}: ReviewFormProps) {
  const isEdit = !!existingReview
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (rating < 1 || rating > 5) {
      setError('Please select a rating.')
      return
    }

    setIsLoading(true)

    try {
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit
        ? {
            review_id: existingReview!.id,
            rating,
            review_text: reviewText.trim() || null,
          }
        : {
            classroom_id: classroomId,
            rating,
            review_text: reviewText.trim() || null,
          }

      const res = await fetch('/api/reviews', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }

      setSuccess(true)
      onSubmitted?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl glass-surface p-5">
        <div className="flex items-center gap-2 text-[var(--success)]">
          <span className="material-symbols-outlined text-[20px]">
            check_circle
          </span>
          <span className="text-sm font-semibold">
            {isEdit ? 'Review updated successfully!' : 'Review submitted successfully!'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl glass-surface p-5 space-y-4"
    >
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block mb-2">
          Your Rating
        </label>
        <StarSelector value={rating} onChange={setRating} />
      </div>

      <div>
        <label
          htmlFor="review-text"
          className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest block mb-2"
        >
          Review (optional)
        </label>
        <textarea
          id="review-text"
          className="input-field min-h-[100px] resize-y w-full"
          placeholder="Share your experience..."
          maxLength={1000}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
        />
        <div className="text-right text-xs text-[var(--muted)] mt-1">
          {reviewText.length}/1000
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[var(--danger)] text-sm">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || rating === 0}
        className="gold-gradient text-black font-bold px-5 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Submitting...
          </>
        ) : isEdit ? (
          'Update Review'
        ) : (
          'Submit Review'
        )}
      </button>
    </form>
  )
}
