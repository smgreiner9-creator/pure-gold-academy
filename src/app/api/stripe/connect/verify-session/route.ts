import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null

// GET /api/stripe/connect/verify-session?session_id=X&classroom_id=Y
export async function GET(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')
    const classroomId = searchParams.get('classroom_id')

    if (!sessionId || !classroomId) {
      return NextResponse.json({ error: 'Missing session_id or classroom_id' }, { status: 400 })
    }

    // Get the user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Retrieve the Stripe checkout session
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return NextResponse.json({ status: 'failed', error: 'Invalid session' })
    }

    // Verify session metadata matches authenticated user and classroom
    if (session.metadata?.student_id !== profile.id) {
      return NextResponse.json({ status: 'failed', error: 'Session does not belong to this user' })
    }

    if (session.metadata?.classroom_id !== classroomId) {
      return NextResponse.json({ status: 'failed', error: 'Session does not match classroom' })
    }

    // Check if webhook has processed and created an active subscription record
    const { data: subscription } = await supabase
      .from('classroom_subscriptions')
      .select('status')
      .eq('student_id', profile.id)
      .eq('classroom_id', classroomId)
      .eq('status', 'active')
      .single()

    if (subscription) {
      // Get classroom name for display
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('name')
        .eq('id', classroomId)
        .single()

      return NextResponse.json({
        status: 'active',
        classroom_name: classroom?.name || null,
      })
    }

    // Session exists but webhook hasn't processed yet
    if (session.payment_status === 'paid' || session.status === 'complete') {
      return NextResponse.json({ status: 'pending' })
    }

    return NextResponse.json({ status: 'failed', error: 'Payment not completed' })
  } catch (error) {
    console.error('Verify session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
