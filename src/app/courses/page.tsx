import { createClient } from '@/lib/supabase/server'
import CourseCatalogClient, { type CourseData } from './CourseCatalogClient'

export const metadata = {
  title: 'Course Catalog | Pure Gold Academy',
  description:
    'Discover expert-led trading courses on Pure Gold Academy. Browse forex, crypto, stocks, and more from verified mentors.',
}

export default async function CourseCatalogPage() {
  const supabase = await createClient()

  // Fetch all public classrooms
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (!classrooms || classrooms.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-3">Discover Trading Courses</h1>
            <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
              Expert-curated courses to help you master the markets. From beginner fundamentals to advanced strategies.
            </p>
          </div>
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-[var(--muted)] mb-4 block">
              school
            </span>
            <h2 className="text-xl font-semibold mb-2">No courses available yet</h2>
            <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
              Our course catalog is growing. Check back soon to discover trading courses from expert mentors.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const classroomIds = classrooms.map((c) => c.id)

  // Fetch lesson counts
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, classroom_id')
    .in('classroom_id', classroomIds)
    .eq('status', 'published')

  // Fetch student counts from classroom_subscriptions
  const { data: subscriptions } = await supabase
    .from('classroom_subscriptions')
    .select('classroom_id, student_id')
    .in('classroom_id', classroomIds)
    .eq('status', 'active')

  // Fetch review stats
  const { data: reviews } = await supabase
    .from('topic_reviews')
    .select('classroom_id, rating')
    .in('classroom_id', classroomIds)

  // Fetch pricing
  const { data: pricing } = await supabase
    .from('classroom_pricing')
    .select('classroom_id, monthly_price')
    .in('classroom_id', classroomIds)
    .eq('is_active', true)

  // Fetch teacher profiles
  const teacherIds = [...new Set(classrooms.map((c) => c.teacher_id))]
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, slug')
    .in('id', teacherIds)
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]))

  // Build course data
  const courseDataList: CourseData[] = classrooms.map((classroom) => {
    const classroomLessons = (lessons || []).filter(
      (l) => l.classroom_id === classroom.id
    )
    const classroomSubs = (subscriptions || []).filter(
      (s) => s.classroom_id === classroom.id
    )
    const uniqueStudents = new Set(classroomSubs.map((s) => s.student_id)).size

    const classroomReviews = (reviews || []).filter(
      (r) => r.classroom_id === classroom.id
    )
    const avgRating =
      classroomReviews.length > 0
        ? classroomReviews.reduce((sum, r) => sum + r.rating, 0) /
          classroomReviews.length
        : 0

    const classroomPricing = (pricing || []).find(
      (p) => p.classroom_id === classroom.id
    )

    const teacher = teacherMap.get(classroom.teacher_id) || null

    return {
      course: {
        id: classroom.id,
        name: classroom.name,
        description: classroom.description,
        tagline: classroom.tagline,
        trading_style: classroom.trading_style,
        markets: classroom.markets,
        logo_url: classroom.logo_url,
        is_paid: classroom.is_paid,
      },
      teacher: {
        display_name: teacher?.display_name ?? null,
        avatar_url: teacher?.avatar_url ?? null,
        slug: teacher?.slug ?? null,
      },
      lessonCount: classroomLessons.length,
      studentCount: uniqueStudents,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: classroomReviews.length,
      price: classroomPricing?.monthly_price ?? null,
    }
  })

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Discover Trading Courses</h1>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
            Expert-curated courses to help you master the markets. From beginner fundamentals to advanced strategies.
          </p>
        </div>

        <CourseCatalogClient courses={courseDataList} />
      </div>
    </div>
  )
}
