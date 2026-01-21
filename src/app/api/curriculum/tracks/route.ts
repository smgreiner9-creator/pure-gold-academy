import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/curriculum/tracks - Get curriculum tracks
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

    let query = supabase
      .from('curriculum_tracks')
      .select(`
        *,
        modules:track_modules(count),
        prerequisite:curriculum_tracks!prerequisite_track_id(id, name)
      `)
      .order('order_index')

    if (profile.role === 'teacher') {
      // Teachers see tracks from their classrooms
      if (classroomId) {
        query = query.eq('classroom_id', classroomId)
      } else {
        // Get all teacher's classroom IDs
        const { data: classrooms } = await supabase
          .from('classrooms')
          .select('id')
          .eq('teacher_id', profile.id)

        if (classrooms && classrooms.length > 0) {
          query = query.in('classroom_id', classrooms.map(c => c.id))
        } else {
          return NextResponse.json({ tracks: [] })
        }
      }
    } else {
      // Students see published tracks from their enrolled classroom
      if (!profile.classroom_id) {
        return NextResponse.json({ tracks: [] })
      }
      query = query.eq('classroom_id', profile.classroom_id).eq('is_published', true)
    }

    const { data: tracks, error } = await query

    if (error) {
      console.error('Error fetching tracks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tracks: tracks || [] })
  } catch (error) {
    console.error('Curriculum tracks GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/curriculum/tracks - Create a new track (teachers only)
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
      return NextResponse.json({ error: 'Only teachers can create tracks' }, { status: 403 })
    }

    const body = await request.json()
    const {
      classroom_id,
      name,
      description,
      difficulty_level,
      prerequisite_track_id,
      estimated_hours,
      icon,
    } = body

    if (!classroom_id || !name) {
      return NextResponse.json({ error: 'Missing required fields: classroom_id, name' }, { status: 400 })
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

    // Get next order index
    const { data: existingTracks } = await supabase
      .from('curriculum_tracks')
      .select('order_index')
      .eq('classroom_id', classroom_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = existingTracks && existingTracks.length > 0 ? existingTracks[0].order_index + 1 : 0

    const { data: track, error: insertError } = await supabase
      .from('curriculum_tracks')
      .insert({
        classroom_id,
        name,
        description: description || null,
        difficulty_level: difficulty_level || 'beginner',
        order_index: nextOrder,
        is_published: false,
        prerequisite_track_id: prerequisite_track_id || null,
        estimated_hours: estimated_hours || null,
        icon: icon || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating track:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ track }, { status: 201 })
  } catch (error) {
    console.error('Curriculum tracks POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/curriculum/tracks - Update a track
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
      return NextResponse.json({ error: 'Only teachers can update tracks' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    // Verify teacher owns this track's classroom
    const { data: existingTrack } = await supabase
      .from('curriculum_tracks')
      .select('id, classroom_id')
      .eq('id', id)
      .single()

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', existingTrack.classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: track, error: updateError } = await supabase
      .from('curriculum_tracks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating track:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ track })
  } catch (error) {
    console.error('Curriculum tracks PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/curriculum/tracks - Delete a track
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
      return NextResponse.json({ error: 'Only teachers can delete tracks' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    // Verify teacher owns this track's classroom
    const { data: existingTrack } = await supabase
      .from('curriculum_tracks')
      .select('id, classroom_id')
      .eq('id', id)
      .single()

    if (!existingTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', existingTrack.classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('curriculum_tracks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting track:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Curriculum tracks DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
