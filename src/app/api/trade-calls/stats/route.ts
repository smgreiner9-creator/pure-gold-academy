import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/trade-calls/stats?teacher_id=X — public stats for teacher profiles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const teacherId = searchParams.get('teacher_id')

    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 })
    }

    // Fetch closed trade calls for this teacher
    const { data: calls, error } = await supabase
      .from('trade_calls')
      .select('status, result_percent')
      .eq('teacher_id', teacherId)
      .neq('status', 'active')
      .neq('status', 'cancelled')

    if (error) {
      console.error('Error fetching trade call stats:', error)
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const totalCalls = calls?.length || 0

    if (totalCalls === 0) {
      return NextResponse.json({
        totalCalls: 0,
        winRate: 0,
        avgReturn: 0,
      })
    }

    // Win = any TP hit status
    const wins = calls.filter(c =>
      c.status === 'hit_tp1' || c.status === 'hit_tp2' || c.status === 'hit_tp3'
    ).length

    const winRate = Math.round((wins / totalCalls) * 100)

    // Average return from result_percent
    const withPercent = calls.filter(c => c.result_percent != null)
    const avgReturn = withPercent.length > 0
      ? Math.round((withPercent.reduce((sum, c) => sum + (c.result_percent || 0), 0) / withPercent.length) * 100) / 100
      : 0

    return NextResponse.json({
      totalCalls,
      winRate,
      avgReturn,
    })
  } catch (error) {
    console.error('Trade call stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
