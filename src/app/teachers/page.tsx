import { createClient } from '@/lib/supabase/server'
import TeacherDirectoryClient from './TeacherDirectoryClient'

export const metadata = {
  title: 'Find Your Trading Mentor | Pure Gold Academy',
  description:
    'Browse verified trading mentors on Pure Gold Academy. Find expert teachers in forex, crypto, stocks, and more.',
}

export default async function TeachersPage() {
  const supabase = await createClient()

  // Fetch all teachers with a slug (publicly visible)
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, slug, role')
    .eq('role', 'teacher')
    .not('slug', 'is', null)
    .order('display_name')

  if (!teachers || teachers.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="max-w-5xl mx-auto px-4 py-16">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">Find Your Trading Mentor</h1>
            <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
              Expert traders sharing their knowledge, strategies, and live calls on Pure Gold Academy.
            </p>
          </div>
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-[var(--muted)] mb-4 block">
              person_search
            </span>
            <h2 className="text-xl font-semibold mb-2">No teachers listed yet</h2>
            <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
              Our teaching community is growing. Check back soon to discover expert mentors ready to help you level up your trading.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch classroom counts and student counts per teacher
  const teacherIds = teachers.map((t) => t.id)

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, teacher_id, is_public')
    .in('teacher_id', teacherIds)
    .eq('is_public', true)

  const classroomIds = (classrooms || []).map((c) => c.id)

  // Fetch student counts from classroom_subscriptions
  const { data: subscriptions } = classroomIds.length > 0
    ? await supabase
        .from('classroom_subscriptions')
        .select('classroom_id, student_id')
        .in('classroom_id', classroomIds)
        .eq('status', 'active')
    : { data: [] }

  // Fetch review stats
  const { data: reviews } = classroomIds.length > 0
    ? await supabase
        .from('topic_reviews')
        .select('classroom_id, rating')
        .in('classroom_id', classroomIds)
    : { data: [] }

  // Fetch trade call counts to determine track record
  const { data: tradeCalls } = classroomIds.length > 0
    ? await supabase
        .from('trade_calls')
        .select('classroom_id, status, result_percent')
        .in('classroom_id', classroomIds)
    : { data: [] }

  // Build stats per teacher
  const teacherStats = teachers.map((teacher) => {
    const teacherClassrooms = (classrooms || []).filter(
      (c) => c.teacher_id === teacher.id
    )
    const teacherClassroomIds = teacherClassrooms.map((c) => c.id)

    const teacherSubs = (subscriptions || []).filter((s) =>
      teacherClassroomIds.includes(s.classroom_id)
    )
    const uniqueStudents = new Set(teacherSubs.map((s) => s.student_id)).size

    const teacherReviews = (reviews || []).filter((r) =>
      teacherClassroomIds.includes(r.classroom_id)
    )
    const avgRating =
      teacherReviews.length > 0
        ? teacherReviews.reduce((sum, r) => sum + r.rating, 0) /
          teacherReviews.length
        : 0

    const teacherCalls = (tradeCalls || []).filter((tc) =>
      teacherClassroomIds.includes(tc.classroom_id)
    )
    const closedCalls = teacherCalls.filter(
      (tc) =>
        tc.status === 'hit_tp1' ||
        tc.status === 'hit_tp2' ||
        tc.status === 'hit_tp3' ||
        tc.status === 'hit_sl' ||
        tc.status === 'manual_close'
    )

    return {
      teacher,
      classroomCount: teacherClassrooms.length,
      studentCount: uniqueStudents,
      avgRating,
      reviewCount: teacherReviews.length,
      hasTrackRecord: closedCalls.length >= 10,
    }
  })

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Find Your Trading Mentor</h1>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
            Expert traders sharing their knowledge, strategies, and live calls on Pure Gold Academy.
          </p>
        </div>

        <TeacherDirectoryClient teacherStats={teacherStats} />
      </div>
    </div>
  )
}
