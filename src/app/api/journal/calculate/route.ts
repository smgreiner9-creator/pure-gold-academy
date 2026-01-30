import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePnl } from '@/lib/pnlCalculator'

// POST /api/journal/calculate — server-side P&L calculation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { instrument, direction, entryPrice, exitPrice, positionSize, stopLoss } = body

    if (!instrument || !direction || entryPrice == null || exitPrice == null || positionSize == null) {
      return NextResponse.json(
        { error: 'Missing required fields: instrument, direction, entryPrice, exitPrice, positionSize' },
        { status: 400 }
      )
    }

    const result = calculatePnl({
      instrument,
      direction,
      entryPrice: parseFloat(entryPrice),
      exitPrice: parseFloat(exitPrice),
      positionSize: parseFloat(positionSize),
      stopLoss: stopLoss != null ? parseFloat(stopLoss) : null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Journal calculate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
