import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/live-sessions - Get live sessions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, classroom_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const classroomId = searchParams.get('classroom_id')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'

    let query = supabase
      .from('live_sessions')
      .select(`
        *,
        teacher:profiles!live_sessions_teacher_id_fkey(id, display_name, avatar_url)
      `)
      .order('scheduled_start', { ascending: true })

    if (profile.role === 'teacher') {
      query = query.eq('teacher_id', profile.id)
      if (classroomId) {
        query = query.eq('classroom_id', classroomId)
      }
    } else {
      // Students see sessions from their classroom
      if (!profile.classroom_id) {
        return NextResponse.json({ sessions: [] })
      }
      query = query.eq('classroom_id', profile.classroom_id)
    }

    if (status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.eq('status', status as any)
    }

    if (upcoming) {
      query = query.gte('scheduled_start', new Date().toISOString())
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Live sessions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/live-sessions - Create a new session (teachers only)
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
      return NextResponse.json({ error: 'Only teachers can create sessions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      classroom_id,
      title,
      description,
      scheduled_start,
      scheduled_duration_minutes,
      stream_url,
      thumbnail_url,
      max_attendees,
    } = body

    if (!classroom_id || !title || !scheduled_start) {
      return NextResponse.json(
        { error: 'Missing required fields: classroom_id, title, scheduled_start' },
        { status: 400 }
      )
    }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 })
    }

    const { data: session, error: insertError } = await supabase
      .from('live_sessions')
      .insert({
        classroom_id,
        teacher_id: profile.id,
        title,
        description: description || null,
        scheduled_start,
        scheduled_duration_minutes: scheduled_duration_minutes || 60,
        status: 'scheduled',
        stream_url: stream_url || null,
        thumbnail_url: thumbnail_url || null,
        max_attendees: max_attendees || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Live sessions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/live-sessions - Update a session
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
      return NextResponse.json({ error: 'Only teachers can update sessions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Handle status transitions
    if (updates.status === 'live') {
      updates.actual_start = new Date().toISOString()
    } else if (updates.status === 'ended') {
      updates.actual_end = new Date().toISOString()
    }

    const { data: session, error: updateError } = await supabase
      .from('live_sessions')
      .update(updates)
      .eq('id', id)
      .eq('teacher_id', profile.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Live sessions PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/live-sessions - Delete a session
export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only teachers can delete sessions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('live_sessions')
      .delete()
      .eq('id', id)
      .eq('teacher_id', profile.id)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Live sessions DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
