import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/lessons - Create a new lesson with dual-write to learn_content
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
    const {
      classroom_id,
      title,
      content_type,
      content_url,
      content_text,
      explanation,
      status = 'draft',
      attachment_urls = [],
    } = body

    if (!classroom_id || !title?.trim()) {
      return NextResponse.json({ error: 'classroom_id and title are required' }, { status: 400 })
    }

    // Verify teacher owns this classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or not owned by you' }, { status: 404 })
    }

    // Get order index
    const { count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', classroom_id)

    // Insert lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert({
        classroom_id,
        teacher_id: profile.id,
        title: title.trim(),
        summary: explanation?.trim()?.substring(0, 200) || null,
        content_type: content_type || null,
        content_url: content_url || null,
        content_text: content_text || null,
        explanation: explanation?.trim() || '',
        status,
        attachment_urls,
        order_index: count || 0,
      })
      .select()
      .single()

    if (lessonError) {
      return NextResponse.json({ error: lessonError.message }, { status: 500 })
    }

    // Dual-write to learn_content for backward compatibility
    const learnContentType = content_type === 'chart' ? 'image' : (content_type || 'text')
    const { error: learnError } = await supabase
      .from('learn_content')
      .insert({
        classroom_id,
        teacher_id: profile.id,
        lesson_id: lesson.id,
        title: title.trim(),
        description: explanation?.trim()?.substring(0, 200) || null,
        explanation: explanation?.trim() || null,
        content_type: learnContentType,
        content_url: content_url || null,
        content_text: content_text || null,
        order_index: count || 0,
        is_premium: false,
      })

    if (learnError) {
      console.error('Dual-write to learn_content failed:', learnError)
    }

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/lessons - Update an existing lesson
export async function PATCH(request: NextRequest) {
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
    const { id, title, content_url, content_text, explanation, status, attachment_urls } = body

    if (!id) {
      return NextResponse.json({ error: 'Lesson id is required' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title.trim()
    if (content_url !== undefined) updates.content_url = content_url || null
    if (content_text !== undefined) updates.content_text = content_text || null
    if (explanation !== undefined) {
      updates.explanation = explanation.trim()
      updates.summary = explanation.trim().substring(0, 200)
    }
    if (status !== undefined) updates.status = status
    if (attachment_urls !== undefined) updates.attachment_urls = attachment_urls

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .eq('teacher_id', profile.id)
      .select()
      .single()

    if (lessonError) {
      return NextResponse.json({ error: lessonError.message }, { status: 500 })
    }

    // Also update the corresponding learn_content row
    const learnUpdates: Record<string, unknown> = {}
    if (title !== undefined) learnUpdates.title = title.trim()
    if (content_url !== undefined) learnUpdates.content_url = content_url || null
    if (content_text !== undefined) learnUpdates.content_text = content_text || null
    if (explanation !== undefined) {
      learnUpdates.explanation = explanation.trim()
      learnUpdates.description = explanation.trim().substring(0, 200)
    }

    if (Object.keys(learnUpdates).length > 0) {
      await supabase
        .from('learn_content')
        .update(learnUpdates)
        .eq('lesson_id', id)
        .eq('teacher_id', profile.id)
    }

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error updating lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
