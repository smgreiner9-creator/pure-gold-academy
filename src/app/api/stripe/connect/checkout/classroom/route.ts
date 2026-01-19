import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null

const PLATFORM_FEE_PERCENT = 15

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Only students can subscribe to classrooms' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { classroom_id } = body

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID required' }, { status: 400 })
    }

    // Check if student already has an active subscription to this classroom
    const { data: existingSubscription } = await supabase
      .from('classroom_subscriptions')
      .select('*')
      .eq('student_id', profile.id)
      .eq('classroom_id', classroom_id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json({ error: 'You already have an active subscription to this classroom' }, { status: 400 })
    }

    // Get classroom and pricing
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, name, teacher_id')
      .eq('id', classroom_id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    const { data: pricing } = await supabase
      .from('classroom_pricing')
      .select('*')
      .eq('classroom_id', classroom_id)
      .single()

    if (!pricing || pricing.pricing_type !== 'paid' || !pricing.stripe_price_id) {
      return NextResponse.json({ error: 'This classroom does not have paid pricing configured' }, { status: 400 })
    }

    // Get teacher's Stripe account
    const { data: teacherStripe } = await supabase
      .from('teacher_stripe_accounts')
      .select('stripe_account_id')
      .eq('teacher_id', classroom.teacher_id)
      .single()

    if (!teacherStripe?.stripe_account_id) {
      return NextResponse.json({ error: 'Teacher has not connected their Stripe account' }, { status: 400 })
    }

    // Create or get Stripe customer for this student
    let customerId: string
    const customers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    })

    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          student_id: profile.id,
        },
      })
      customerId = customer.id
    }

    // Create Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: pricing.stripe_price_id,
          quantity: 1,
        },
      ],
      subscription_data: {
        application_fee_percent: PLATFORM_FEE_PERCENT,
        trial_period_days: pricing.trial_days || undefined,
        metadata: {
          classroom_id: classroom_id,
          student_id: profile.id,
        },
      },
      success_url: `${baseUrl}/classroom/join/success?classroom_id=${classroom_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/classroom/join/${classroom_id}?cancelled=true`,
      metadata: {
        classroom_id: classroom_id,
        student_id: profile.id,
        teacher_id: classroom.teacher_id,
      },
    }, {
      stripeAccount: teacherStripe.stripe_account_id,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
