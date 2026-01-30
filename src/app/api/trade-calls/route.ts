import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/trade-calls - Get trade calls (teachers get their own, students get from their classroom)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, classroom_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const classroomId = searchParams.get('classroom_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('trade_calls')
      .select(`
        *,
        teacher:profiles!trade_calls_teacher_id_fkey(id, display_name, avatar_url)
      `, { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (profile.role === 'teacher') {
      // Teachers see their own trade calls
      query = query.eq('teacher_id', profile.id)
      if (classroomId) {
        query = query.eq('classroom_id', classroomId)
      }
    } else {
      // Students see trade calls from their enrolled classroom
      if (!profile.classroom_id) {
        return NextResponse.json({ trade_calls: [], total: 0 })
      }
      query = query.eq('classroom_id', profile.classroom_id)
    }

    if (status) {
      if (status === 'active') {
        query = query.eq('status', 'active')
      } else if (status === 'closed') {
        query = query.neq('status', 'active')
      }
    }

    const { data: tradeCalls, error, count } = await query

    if (error) {
      console.error('Error fetching trade calls:', error)
      return NextResponse.json({ error: 'Failed to fetch trade calls' }, { status: 500 })
    }

    return NextResponse.json({
      trade_calls: tradeCalls || [],
      total: count ?? tradeCalls?.length ?? 0
    })
  } catch (error) {
    console.error('Trade calls GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/trade-calls - Create a new trade call (teachers only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create trade calls' }, { status: 403 })
    }

    const body = await request.json()
    const {
      classroom_id,
      instrument,
      direction,
      entry_price,
      stop_loss,
      take_profit_1,
      take_profit_2,
      take_profit_3,
      timeframe,
      analysis_text,
      chart_url,
    } = body

    // Validate required fields
    if (!classroom_id || !instrument || !direction || !entry_price || !stop_loss) {
      return NextResponse.json(
        { error: 'Missing required fields: classroom_id, instrument, direction, entry_price, stop_loss' },
        { status: 400 }
      )
    }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 })
    }

    // Calculate R:R ratio if TP1 is provided
    let risk_reward_ratio = null
    if (take_profit_1) {
      const risk = Math.abs(entry_price - stop_loss)
      const reward = Math.abs(take_profit_1 - entry_price)
      if (risk > 0) {
        risk_reward_ratio = reward / risk
      }
    }

    // Create trade call
    const { data: tradeCall, error: insertError } = await supabase
      .from('trade_calls')
      .insert({
        classroom_id,
        teacher_id: profile.id,
        instrument: instrument.toUpperCase(),
        direction,
        entry_price,
        stop_loss,
        take_profit_1: take_profit_1 || null,
        take_profit_2: take_profit_2 || null,
        take_profit_3: take_profit_3 || null,
        risk_reward_ratio,
        timeframe: timeframe || null,
        analysis_text: analysis_text || null,
        chart_url: chart_url || null,
        status: 'active',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating trade call:', insertError)
      return NextResponse.json({ error: 'Failed to create trade call' }, { status: 500 })
    }

    return NextResponse.json({ trade_call: tradeCall }, { status: 201 })
  } catch (error) {
    console.error('Trade calls POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/trade-calls - Update a trade call (close or edit)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can update trade calls' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...rawUpdates } = body

    if (!id) {
      return NextResponse.json({ error: 'Trade call ID is required' }, { status: 400 })
    }

    // Whitelist allowed update fields to prevent arbitrary column updates
    const allowedFields = [
      'status', 'result_pips', 'close_price', 'analysis_text', 'chart_url',
      'entry_price', 'stop_loss', 'take_profit_1', 'take_profit_2', 'take_profit_3',
      'timeframe', 'instrument', 'direction', 'risk_reward_ratio',
    ]
    const updates: Record<string, unknown> = Object.fromEntries(
      Object.entries(rawUpdates).filter(([key]) => allowedFields.includes(key))
    )

    // Verify teacher owns this trade call
    const { data: existingCall } = await supabase
      .from('trade_calls')
      .select('id, teacher_id')
      .eq('id', id)
      .eq('teacher_id', profile.id)
      .single()

    if (!existingCall) {
      return NextResponse.json({ error: 'Trade call not found or unauthorized' }, { status: 404 })
    }

    // If closing, add closed_at timestamp
    if (updates.status && updates.status !== 'active') {
      updates.closed_at = new Date().toISOString()
    }

    const { data: updatedCall, error: updateError } = await supabase
      .from('trade_calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating trade call:', updateError)
      return NextResponse.json({ error: 'Failed to update trade call' }, { status: 500 })
    }

    return NextResponse.json({ trade_call: updatedCall })
  } catch (error) {
    console.error('Trade calls PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/trade-calls - Delete a trade call
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can delete trade calls' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Trade call ID is required' }, { status: 400 })
    }

    // Verify teacher owns this trade call and delete
    const { error: deleteError } = await supabase
      .from('trade_calls')
      .delete()
      .eq('id', id)
      .eq('teacher_id', profile.id)

    if (deleteError) {
      console.error('Error deleting trade call:', deleteError)
      return NextResponse.json({ error: 'Failed to delete trade call' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trade calls DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
