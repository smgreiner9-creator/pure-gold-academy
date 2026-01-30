import Link from 'next/link'

interface TeacherProfileCardProps {
  teacher: {
    id: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    slug: string | null
    role: string
  }
  classroomCount?: number
  studentCount?: number
  avgRating?: number
  reviewCount?: number
  hasTrackRecord?: boolean
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

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="material-symbols-outlined text-sm"
          style={{
            color: star <= Math.round(rating) ? 'var(--gold)' : 'var(--muted)',
            fontSize: '14px',
          }}
        >
          star
        </span>
      ))}
    </span>
  )
}

export default function TeacherProfileCard({
  teacher,
  classroomCount = 0,
  studentCount = 0,
  avgRating = 0,
  reviewCount = 0,
  hasTrackRecord = false,
}: TeacherProfileCardProps) {
  const href = teacher.slug ? `/teachers/${teacher.slug}` : '#'

  return (
    <Link href={href} className="block group">
      <div className="p-6 rounded-2xl glass-surface glass-interactive transition-all duration-200">
        {/* Header: Avatar + Name */}
        <div className="flex items-center gap-4 mb-4">
          {teacher.avatar_url ? (
            <img
              src={teacher.avatar_url}
              alt={teacher.display_name || 'Teacher'}
              className="w-14 h-14 rounded-full object-cover border-2 border-[var(--gold)]/30"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[var(--gold)]/10 border-2 border-[var(--gold)]/30 flex items-center justify-center">
              <span className="text-[var(--gold)] font-bold text-lg">
                {getInitials(teacher.display_name)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg truncate group-hover:text-[var(--gold)] transition-colors">
                {teacher.display_name || 'Anonymous Teacher'}
              </h3>
              {hasTrackRecord && (
                <span
                  className="material-symbols-outlined text-[var(--gold)] text-lg shrink-0"
                  title="Verified Track Record"
                >
                  verified
                </span>
              )}
            </div>
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <StarRating rating={avgRating} />
                <span className="text-xs text-[var(--muted)]">
                  ({reviewCount})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {teacher.bio && (
          <p className="text-sm text-[var(--muted)] line-clamp-2 mb-4">
            {teacher.bio}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 pt-4 border-t border-[var(--glass-surface-border)]">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[var(--gold)] text-base">
              school
            </span>
            <span className="text-sm font-medium">{classroomCount}</span>
            <span className="text-xs text-[var(--muted)]">
              {classroomCount === 1 ? 'topic' : 'topics'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[var(--gold)] text-base">
              group
            </span>
            <span className="text-sm font-medium">{studentCount}</span>
            <span className="text-xs text-[var(--muted)]">
              {studentCount === 1 ? 'student' : 'students'}
            </span>
          </div>
          {avgRating > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="material-symbols-outlined text-[var(--gold)] text-base">
                star
              </span>
              <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
