import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/curriculum/modules - Get modules for a track
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const trackId = searchParams.get('track_id')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    const { data: modules, error } = await supabase
      .from('track_modules')
      .select(`
        *,
        content:learn_content(count)
      `)
      .eq('track_id', trackId)
      .order('order_index')

    if (error) {
      console.error('Error fetching modules:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ modules: modules || [] })
  } catch (error) {
    console.error('Modules GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/curriculum/modules - Create a new module (teachers only)
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
      return NextResponse.json({ error: 'Only teachers can create modules' }, { status: 403 })
    }

    const body = await request.json()
    const { track_id, title, summary } = body

    if (!track_id || !title) {
      return NextResponse.json({ error: 'Missing required fields: track_id, title' }, { status: 400 })
    }

    // Verify teacher owns the track's classroom
    const { data: track } = await supabase
      .from('curriculum_tracks')
      .select('id, classroom_id')
      .eq('id', track_id)
      .single()

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', track.classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get next order index
    const { data: existingModules } = await supabase
      .from('track_modules')
      .select('order_index')
      .eq('track_id', track_id)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = existingModules && existingModules.length > 0 ? existingModules[0].order_index + 1 : 0

    const { data: module, error: insertError } = await supabase
      .from('track_modules')
      .insert({
        track_id,
        title,
        summary: summary || null,
        order_index: nextOrder,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating module:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ module }, { status: 201 })
  } catch (error) {
    console.error('Modules POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/curriculum/modules - Update a module
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
      return NextResponse.json({ error: 'Only teachers can update modules' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
    }

    const { data: module, error: updateError } = await supabase
      .from('track_modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating module:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ module })
  } catch (error) {
    console.error('Modules PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/curriculum/modules - Delete a module
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
      return NextResponse.json({ error: 'Only teachers can delete modules' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('track_modules')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting module:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Modules DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
