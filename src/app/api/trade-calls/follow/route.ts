import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/trade-calls/follow - Follow a trade call (students only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, classroom_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role === 'teacher') {
      return NextResponse.json({ error: 'Teachers cannot follow trade calls' }, { status: 403 })
    }

    if (!profile.classroom_id) {
      return NextResponse.json({ error: 'You must join a classroom first' }, { status: 403 })
    }

    const body = await request.json()
    const { trade_call_id, journal_entry_id } = body

    if (!trade_call_id) {
      return NextResponse.json({ error: 'Trade call ID is required' }, { status: 400 })
    }

    // Verify the trade call exists and is from the student's classroom
    const { data: tradeCall } = await supabase
      .from('trade_calls')
      .select('id, classroom_id')
      .eq('id', trade_call_id)
      .eq('classroom_id', profile.classroom_id)
      .single()

    if (!tradeCall) {
      return NextResponse.json({ error: 'Trade call not found or unauthorized' }, { status: 404 })
    }

    // Create or update follow
    const { data: follow, error: upsertError } = await supabase
      .from('trade_call_follows')
      .upsert({
        trade_call_id,
        student_id: profile.id,
        journal_entry_id: journal_entry_id || null,
        followed_at: new Date().toISOString(),
      }, {
        onConflict: 'trade_call_id,student_id',
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error following trade call:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ follow }, { status: 201 })
  } catch (error) {
    console.error('Trade call follow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/trade-calls/follow - Get student's followed trade calls
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const tradeCallId = searchParams.get('trade_call_id')

    let query = supabase
      .from('trade_call_follows')
      .select(`
        *,
        trade_call:trade_calls(*)
      `)
      .eq('student_id', profile.id)

    if (tradeCallId) {
      query = query.eq('trade_call_id', tradeCallId)
    }

    const { data: follows, error } = await query.order('followed_at', { ascending: false })

    if (error) {
      console.error('Error fetching follows:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ follows: follows || [] })
  } catch (error) {
    console.error('Trade call follows GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/trade-calls/follow - Unfollow a trade call
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const tradeCallId = searchParams.get('trade_call_id')

    if (!tradeCallId) {
      return NextResponse.json({ error: 'Trade call ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('trade_call_follows')
      .delete()
      .eq('trade_call_id', tradeCallId)
      .eq('student_id', profile.id)

    if (deleteError) {
      console.error('Error unfollowing trade call:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trade call unfollow error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
