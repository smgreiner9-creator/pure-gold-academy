import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name, description, tagline')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!classroom) {
    return { title: 'Course Not Found | Pure Gold Academy' }
  }

  return {
    title: `${classroom.name} | Pure Gold Academy`,
    description: classroom.tagline || classroom.description || `Learn trading with ${classroom.name} on Pure Gold Academy.`,
  }
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(
        <span key={i} className="material-symbols-outlined text-[18px] text-[var(--gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>
          star
        </span>
      )
    } else if (i - rating < 1 && i - rating > 0) {
      stars.push(
        <span key={i} className="material-symbols-outlined text-[18px] text-[var(--gold)]" style={{ fontVariationSettings: "'FILL' 1" }}>
          star_half
        </span>
      )
    } else {
      stars.push(
        <span key={i} className="material-symbols-outlined text-[18px] text-[var(--muted)]">
          star
        </span>
      )
    }
  }
  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="text-sm text-[var(--muted)] ml-1.5">
        {rating.toFixed(1)} ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  )
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!classroom) {
    notFound()
  }

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, content_type, status')
    .eq('classroom_id', id)
    .eq('status', 'published')
    .order('order_index')

  const { data: reviews } = await supabase
    .from('topic_reviews')
    .select('*')
    .eq('classroom_id', id)
    .order('created_at', { ascending: false })

  // Fetch student profiles for reviews
  const reviewStudentIds = [...new Set((reviews || []).map((r) => r.student_id))]
  const { data: reviewStudents } =
    reviewStudentIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', reviewStudentIds)
      : { data: [] }
  const studentMap = new Map((reviewStudents || []).map((s) => [s.id, s]))

  const { data: pricing } = await supabase
    .from('classroom_pricing')
    .select('*')
    .eq('classroom_id', id)
    .eq('is_active', true)
    .single()

  // Student count
  const { data: subscriptions } = await supabase
    .from('classroom_subscriptions')
    .select('student_id')
    .eq('classroom_id', id)
    .eq('status', 'active')

  // Fetch teacher profile
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, slug, bio')
    .eq('id', classroom.teacher_id)
    .single()

  const studentCount = new Set((subscriptions || []).map((s) => s.student_id)).size
  const lessonCount = (lessons || []).length
  const reviewList = reviews || []
  const avgRating =
    reviewList.length > 0
      ? reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length
      : 0

  const teacher = teacherProfile

  const contentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return 'play_circle'
      case 'text':
        return 'article'
      case 'quiz':
        return 'quiz'
      default:
        return 'description'
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--gold)] transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Courses
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {/* Course info */}
          <div className="flex-1">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl glass-surface flex items-center justify-center mb-6 overflow-hidden">
              {classroom.logo_url ? (
                <Image
                  src={classroom.logo_url}
                  alt={classroom.name}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-3xl text-[var(--gold)]/40">
                  school
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-2">{classroom.name}</h1>

            {classroom.tagline && (
              <p className="text-lg text-[var(--muted)] mb-4">{classroom.tagline}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                <span className="material-symbols-outlined text-[18px]">group</span>
                {studentCount} students
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                {lessonCount} lessons
              </div>
              <StarRating rating={Math.round(avgRating * 10) / 10} count={reviewList.length} />
            </div>

            {/* Markets + Trading style */}
            <div className="flex flex-wrap gap-2 mb-6">
              {classroom.trading_style && (
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20">
                  {classroom.trading_style}
                </span>
              )}
              {classroom.markets &&
                classroom.markets.map((market: string) => (
                  <span
                    key={market}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 text-[var(--muted)]"
                  >
                    {market}
                  </span>
                ))}
            </div>

            {/* Description */}
            {classroom.description && (
              <div className="prose prose-invert max-w-none">
                <p className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-line">
                  {classroom.description}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar: Pricing + CTA */}
          <div className="lg:w-80 shrink-0">
            <div className="rounded-2xl glass-surface p-6 sticky top-8">
              {/* Price */}
              <div className="text-center mb-6">
                {classroom.is_paid && pricing?.monthly_price ? (
                  <>
                    <div className="text-3xl font-bold text-[var(--gold)] mb-1">
                      ${pricing.monthly_price.toFixed(2)}
                      <span className="text-base font-normal text-[var(--muted)]">/mo</span>
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-bold text-[var(--success)]">Free</div>
                )}
              </div>

              {/* CTA */}
              <button className="btn-gold w-full text-center rounded-xl py-3 text-sm font-bold">
                {classroom.is_paid ? 'Subscribe Now' : 'Join for Free'}
              </button>

              <p className="text-[10px] text-[var(--muted)] text-center mt-3">
                {classroom.is_paid
                  ? 'Cancel anytime. Instant access to all lessons.'
                  : 'Instant access. No credit card required.'}
              </p>
            </div>
          </div>
        </div>

        {/* Teacher section */}
        {teacher && (
          <div className="rounded-2xl glass-surface p-6 mb-10">
            <h2 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
              Your Instructor
            </h2>
            <div className="flex items-start gap-4">
              {teacher.avatar_url ? (
                <Image
                  src={teacher.avatar_url}
                  alt={teacher.display_name || 'Teacher'}
                  width={56}
                  height={56}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[var(--glass-surface-border)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-[var(--muted)]">
                    person
                  </span>
                </div>
              )}
              <div className="flex-1">
                {teacher.slug ? (
                  <Link
                    href={`/teachers/${teacher.slug}`}
                    className="text-lg font-bold hover:text-[var(--gold)] transition-colors"
                  >
                    {teacher.display_name || 'Unknown Teacher'}
                  </Link>
                ) : (
                  <p className="text-lg font-bold">
                    {teacher.display_name || 'Unknown Teacher'}
                  </p>
                )}
                {teacher.bio && (
                  <p className="text-sm text-[var(--muted)] mt-1 line-clamp-3">
                    {teacher.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lessons */}
        {lessons && lessons.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
              Course Content
            </h2>
            <div className="rounded-2xl glass-surface divide-y divide-[var(--glass-surface-border)]">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span className="text-xs text-[var(--muted)] font-mono w-6 text-right shrink-0">
                    {index + 1}
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-[var(--muted)]">
                    {contentTypeIcon(lesson.content_type || '')}
                  </span>
                  <span className="text-sm font-medium flex-1">{lesson.title}</span>
                  <span className="material-symbols-outlined text-[18px] text-[var(--glass-surface-border)]">
                    lock
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviewList.length > 0 && (
          <div>
            <h2 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
              Student Reviews ({reviewList.length})
            </h2>
            <div className="space-y-4">
              {reviewList.map((review) => {
                const student = studentMap.get(review.student_id) || null

                return (
                  <div
                    key={review.id}
                    className="rounded-2xl glass-surface p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {student?.avatar_url ? (
                        <Image
                          src={student.avatar_url}
                          alt={student.display_name || 'Student'}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--glass-surface-border)] flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm text-[var(--muted)]">
                            person
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">
                          {student?.display_name || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`material-symbols-outlined text-[14px] ${
                                i < review.rating
                                  ? 'text-[var(--gold)]'
                                  : 'text-[var(--muted)]'
                              }`}
                              style={
                                i < review.rating
                                  ? { fontVariationSettings: "'FILL' 1" }
                                  : undefined
                              }
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-[var(--muted)] leading-relaxed">
                        {review.review_text}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
