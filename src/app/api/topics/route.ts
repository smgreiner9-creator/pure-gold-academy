import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/topics - List teacher's topics with lesson counts
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch classrooms
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false })

    if (classroomsError) {
      return NextResponse.json({ error: classroomsError.message }, { status: 500 })
    }

    if (!classrooms || classrooms.length === 0) {
      return NextResponse.json({ topics: [] })
    }

    // Fetch lesson counts and pricing for all classrooms
    const classroomIds = classrooms.map(c => c.id)

    const [lessonsRes, pricingRes, studentsRes] = await Promise.all([
      supabase.from('lessons').select('classroom_id').in('classroom_id', classroomIds),
      supabase.from('classroom_pricing').select('*').in('classroom_id', classroomIds),
      supabase.from('profiles').select('classroom_id').in('classroom_id', classroomIds),
    ])

    // Build counts
    const lessonCounts: Record<string, number> = {}
    for (const l of lessonsRes.data || []) {
      lessonCounts[l.classroom_id] = (lessonCounts[l.classroom_id] || 0) + 1
    }

    const studentCounts: Record<string, number> = {}
    for (const s of studentsRes.data || []) {
      if (s.classroom_id) {
        studentCounts[s.classroom_id] = (studentCounts[s.classroom_id] || 0) + 1
      }
    }

    const pricingData = pricingRes.data || []
    const pricingMap: Record<string, (typeof pricingData)[number]> = {}
    for (const p of pricingData) {
      pricingMap[p.classroom_id] = p
    }

    const topics = classrooms.map(c => ({
      ...c,
      lesson_count: lessonCounts[c.id] || 0,
      student_count: studentCounts[c.id] || 0,
      pricing: pricingMap[c.id] || null,
    }))

    return NextResponse.json({ topics })
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/topics - Create a new topic with pricing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, pricing_type = 'free', monthly_price = 0 } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: profile.id,
        name: name.trim(),
        description: description?.trim() || null,
        is_public: true,
      })
      .select()
      .single()

    if (classroomError) {
      return NextResponse.json({ error: classroomError.message }, { status: 500 })
    }

    // Create pricing
    const { error: pricingError } = await supabase
      .from('classroom_pricing')
      .insert({
        classroom_id: classroom.id,
        pricing_type: pricing_type === 'paid' ? 'paid' : 'free',
        monthly_price: pricing_type === 'paid' ? Math.max(1, monthly_price) : 0,
      })

    if (pricingError) {
      console.error('Error creating pricing:', pricingError)
    }

    return NextResponse.json({ topic: classroom }, { status: 201 })
  } catch (error) {
    console.error('Error creating topic:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
