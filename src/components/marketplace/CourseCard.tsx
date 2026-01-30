import Link from 'next/link'
import Image from 'next/image'

export interface CourseCardProps {
  course: {
    id: string
    name: string
    description: string | null
    tagline: string | null
    trading_style: string | null
    markets: string[] | null
    logo_url: string | null
    is_paid: boolean
  }
  teacher: {
    display_name: string | null
    avatar_url: string | null
    slug: string | null
  }
  lessonCount: number
  studentCount: number
  avgRating: number
  reviewCount: number
  price?: number | null
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(
        <span key={i} className="material-symbols-outlined text-[14px] text-[var(--gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </span>
      )
    } else if (i - rating < 1 && i - rating > 0) {
      stars.push(
        <span key={i} className="material-symbols-outlined text-[14px] text-[var(--gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>
          star_half
        </span>
      )
    } else {
      stars.push(
        <span key={i} className="material-symbols-outlined text-[14px] text-[var(--muted)]">
          star
        </span>
      )
    }
  }
  return (
    <div className="flex items-center gap-0.5">
      {stars}
      {count > 0 && (
        <span className="text-xs text-[var(--muted)] ml-1">({count})</span>
      )}
    </div>
  )
}

export default function CourseCard({
  course,
  teacher,
  lessonCount,
  studentCount,
  avgRating,
  reviewCount,
  price,
}: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block rounded-2xl glass-surface glass-interactive overflow-hidden transition-all duration-300"
    >
      {/* Logo / Header */}
      <div className="h-40 flex items-center justify-center bg-gradient-to-br from-[rgba(255,184,0,0.06)] to-transparent relative">
        {course.logo_url ? (
          <Image
            src={course.logo_url}
            alt={course.name}
            width={80}
            height={80}
            className="rounded-xl object-cover"
          />
        ) : (
          <span className="material-symbols-outlined text-5xl text-[var(--gold)]/40">
            school
          </span>
        )}
        {/* Price badge */}
        <div className="absolute top-3 right-3">
          {course.is_paid && price ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--gold)]/15 text-[var(--gold)]">
              ${price.toFixed(2)}/mo
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--success)]/15 text-[var(--success)]">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Name */}
        <h3 className="text-base font-bold text-[var(--foreground)] truncate mb-1">
          {course.name}
        </h3>

        {/* Tagline */}
        {course.tagline && (
          <p className="text-sm text-[var(--muted)] line-clamp-2 mb-3 leading-relaxed">
            {course.tagline}
          </p>
        )}

        {/* Teacher row */}
        <div className="flex items-center gap-2 mb-4">
          {teacher.avatar_url ? (
            <Image
              src={teacher.avatar_url}
              alt={teacher.display_name || 'Teacher'}
              width={24}
              height={24}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--glass-surface-border)] flex items-center justify-center">
              <span className="material-symbols-outlined text-xs text-[var(--muted)]">
                person
              </span>
            </div>
          )}
          {teacher.slug ? (
            <span
              className="text-sm text-[var(--muted)] hover:text-[var(--gold)] transition-colors truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {teacher.display_name || 'Unknown Teacher'}
            </span>
          ) : (
            <span className="text-sm text-[var(--muted)] truncate">
              {teacher.display_name || 'Unknown Teacher'}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">menu_book</span>
            <span>{lessonCount} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">group</span>
            <span>{studentCount}</span>
          </div>
          <StarRating rating={avgRating} count={reviewCount} />
        </div>

        {/* Markets pills */}
        {course.markets && course.markets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.markets.map((market) => (
              <span
                key={market}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-black/5 text-[var(--muted)]"
              >
                {market}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
