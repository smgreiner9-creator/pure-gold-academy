import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import TrackRecordBadge from '@/components/teacher/TrackRecordBadge'
import TeacherProfileClient from './TeacherProfileClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: teacher } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('slug', slug)
    .eq('role', 'teacher')
    .single()

  if (!teacher) {
    return { title: 'Teacher Not Found | Pure Gold Academy' }
  }

  return {
    title: `${teacher.display_name || 'Teacher'} | Pure Gold Academy`,
    description:
      teacher.bio ||
      `View ${teacher.display_name || 'this teacher'}'s profile, classrooms, and track record on Pure Gold Academy.`,
  }
}

export default async function TeacherProfilePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch teacher by slug
  const { data: teacher } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .eq('role', 'teacher')
    .single()

  if (!teacher) {
    notFound()
  }

  // Fetch their public classrooms
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('teacher_id', teacher.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const classroomIds = (classrooms || []).map((c) => c.id)

  // Fetch pricing for classrooms
  const { data: pricing } =
    classroomIds.length > 0
      ? await supabase
          .from('classroom_pricing')
          .select('*')
          .in('classroom_id', classroomIds)
          .eq('is_active', true)
      : { data: [] }

  // Fetch student counts per classroom
  const { data: subscriptions } =
    classroomIds.length > 0
      ? await supabase
          .from('classroom_subscriptions')
          .select('classroom_id, student_id')
          .in('classroom_id', classroomIds)
          .eq('status', 'active')
      : { data: [] }

  // Fetch lesson counts per classroom
  const { data: lessons } =
    classroomIds.length > 0
      ? await supabase
          .from('lessons')
          .select('id, classroom_id')
          .in('classroom_id', classroomIds)
          .eq('status', 'published')
      : { data: [] }

  // Fetch reviews
  const { data: rawReviews } =
    classroomIds.length > 0
      ? await supabase
          .from('topic_reviews')
          .select('*')
          .in('classroom_id', classroomIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] }

  // Fetch student profiles for reviews
  const reviewStudentIds = [...new Set((rawReviews || []).map((r) => r.student_id))]
  const { data: reviewStudents } =
    reviewStudentIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', reviewStudentIds)
      : { data: [] }
  const reviewStudentMap = new Map((reviewStudents || []).map((s) => [s.id, s]))

  // Merge student data into reviews
  const reviews = (rawReviews || []).map((r) => ({
    ...r,
    student: reviewStudentMap.get(r.student_id) || null,
  }))

  // Fetch trade call stats
  const { data: tradeCalls } =
    classroomIds.length > 0
      ? await supabase
          .from('trade_calls')
          .select('status, result_percent')
          .in('classroom_id', classroomIds)
      : { data: [] }

  // Compute trade stats
  const closedCalls = (tradeCalls || []).filter(
    (tc) =>
      tc.status === 'hit_tp1' ||
      tc.status === 'hit_tp2' ||
      tc.status === 'hit_tp3' ||
      tc.status === 'hit_sl' ||
      tc.status === 'manual_close'
  )
  const winningCalls = closedCalls.filter(
    (tc) =>
      tc.status === 'hit_tp1' ||
      tc.status === 'hit_tp2' ||
      tc.status === 'hit_tp3'
  )
  const winRate =
    closedCalls.length > 0
      ? (winningCalls.length / closedCalls.length) * 100
      : 0
  const avgReturn =
    closedCalls.length > 0
      ? closedCalls.reduce((sum, tc) => sum + (tc.result_percent || 0), 0) /
        closedCalls.length
      : 0

  // Parse social links
  const socialLinks = (teacher.social_links as Record<string, string>) || {}

  // Build classroom stats
  const classroomStats = (classrooms || []).map((c) => {
    const studentCount = new Set(
      (subscriptions || [])
        .filter((s) => s.classroom_id === c.id)
        .map((s) => s.student_id)
    ).size
    const lessonCount = (lessons || []).filter(
      (l) => l.classroom_id === c.id
    ).length
    const pricingInfo = (pricing || []).find((p) => p.classroom_id === c.id)
    return { ...c, studentCount, lessonCount, pricing: pricingInfo || null }
  })

  // All reviews with stats
  const allReviews = reviews
  const avgRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0

  function getInitials(name: string | null): string {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          href="/teachers"
          className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-white transition-colors text-sm mb-8"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          All Teachers
        </Link>

        {/* Profile Header */}
        <div className="p-8 rounded-2xl glass-surface mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            {teacher.avatar_url ? (
              <img
                src={teacher.avatar_url}
                alt={teacher.display_name || 'Teacher'}
                className="w-24 h-24 rounded-full object-cover border-3 border-[var(--gold)]/40"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--gold)]/10 border-3 border-[var(--gold)]/40 flex items-center justify-center">
                <span className="text-[var(--gold)] font-bold text-2xl">
                  {getInitials(teacher.display_name)}
                </span>
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {teacher.display_name || 'Anonymous Teacher'}
              </h1>

              {teacher.bio && (
                <p className="text-[var(--muted)] mb-4 max-w-2xl">
                  {teacher.bio}
                </p>
              )}

              {/* Track Record Badge */}
              {closedCalls.length >= 10 && (
                <div className="mb-4">
                  <TrackRecordBadge
                    totalCalls={closedCalls.length}
                    winRate={winRate}
                    avgReturn={avgReturn}
                  />
                </div>
              )}

              {/* Social Links */}
              {Object.keys(socialLinks).length > 0 && (
                <div className="flex items-center gap-3">
                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--glass-surface-border)] text-sm text-[var(--muted)] hover:text-white hover:border-[var(--gold)]/50 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      X / Twitter
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a
                      href={socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--glass-surface-border)] text-sm text-[var(--muted)] hover:text-white hover:border-[var(--gold)]/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">
                        smart_display
                      </span>
                      YouTube
                    </a>
                  )}
                  {socialLinks.discord && (
                    <a
                      href={socialLinks.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--glass-surface-border)] text-sm text-[var(--muted)] hover:text-white hover:border-[var(--gold)]/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">
                        forum
                      </span>
                      Discord
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Classrooms / Topics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">
            <span className="material-symbols-outlined text-[var(--gold)] align-middle mr-2">
              school
            </span>
            Topics &amp; Classrooms
          </h2>
          {classroomStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classroomStats.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl glass-surface hover:border-[var(--gold)]/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{c.name}</h3>
                    {c.pricing ? (
                      <span className="text-[var(--gold)] font-bold text-sm">
                        ${c.pricing.monthly_price}/mo
                      </span>
                    ) : (
                      <span className="text-[var(--success)] text-sm font-semibold">
                        Free
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-sm text-[var(--muted)] line-clamp-2 mb-3">
                      {c.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[var(--muted)] mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        group
                      </span>
                      {c.studentCount} students
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        menu_book
                      </span>
                      {c.lessonCount} lessons
                    </span>
                    {c.trading_style && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          trending_up
                        </span>
                        {c.trading_style}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/auth/signup?classroom=${c.invite_code}`}
                    className="inline-flex items-center gap-2 h-9 px-5 rounded-lg gold-gradient text-black font-bold text-sm"
                  >
                    <span className="material-symbols-outlined text-base">
                      add
                    </span>
                    Join
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass-surface text-center">
              <span className="material-symbols-outlined text-3xl text-[var(--muted)] mb-2 block">
                school
              </span>
              <p className="text-[var(--muted)] text-sm">
                This teacher hasn&apos;t published any public classrooms yet.
              </p>
            </div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              <span className="material-symbols-outlined text-[var(--gold)] align-middle mr-2">
                reviews
              </span>
              Reviews
              {allReviews.length > 0 && (
                <span className="text-sm font-normal text-[var(--muted)] ml-2">
                  {avgRating.toFixed(1)} avg from {allReviews.length} review{allReviews.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
          </div>

          <TeacherProfileClient reviews={allReviews} />
        </div>
      </div>
    </div>
  )
}
