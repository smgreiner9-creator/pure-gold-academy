import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const classroomId = searchParams.get('classroom_id')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!classroomId) {
    return NextResponse.json({ error: 'classroom_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('topic_reviews')
    .select('*, student:profiles!student_id(display_name, avatar_url)')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reviews: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await request.json()
  const { classroom_id, rating, review_text } = body

  if (!classroom_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Valid classroom_id and rating (1-5) required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('topic_reviews')
    .insert({
      student_id: profile.id,
      classroom_id,
      rating,
      review_text: review_text || null,
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation (already reviewed)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already reviewed this course' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const body = await request.json()
  const { review_id, rating, review_text } = body

  if (!review_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'Valid review_id and rating (1-5) required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('topic_reviews')
    .update({ rating, review_text: review_text || null })
    .eq('id', review_id)
    .eq('student_id', profile.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data })
}
