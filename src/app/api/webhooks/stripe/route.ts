import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

export async function POST(request: NextRequest) {
  if (!stripe || !supabaseAdmin) {
    return NextResponse.json({ error: 'Stripe/Supabase not configured' }, { status: 501 })
  }

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    // Check if this is a Connect event (from a connected account)
    const connectedAccountId = (event as Stripe.Event & { account?: string }).account

    switch (event.type) {
      // ============================================
      // PLATFORM SUBSCRIPTION EVENTS
      // ============================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Check if this is a classroom subscription (Connect) or platform subscription
        const classroomId = session.metadata?.classroom_id
        const studentId = session.metadata?.student_id

        if (classroomId && studentId) {
          // This is a classroom subscription via Connect
          await handleClassroomSubscriptionCreated(session, studentId, classroomId)
        } else {
          // This is a platform premium subscription
          const userId = session.metadata?.userId
          const customerId = session.customer as string
          const subscriptionId = session.subscription as string

          if (userId) {
            await supabaseAdmin.from('subscriptions').upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              tier: 'premium',
              status: 'active',
            })

            await supabaseAdmin
              .from('profiles')
              .update({ subscription_tier: 'premium' })
              .eq('id', userId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const classroomId = subscription.metadata?.classroom_id

        if (classroomId && connectedAccountId) {
          // This is a classroom subscription update
          await handleClassroomSubscriptionUpdated(subscription, classroomId)
        } else {
          // This is a platform subscription update
          const updateData: Record<string, unknown> = { status: subscription.status }

          if (subscription.current_period_start) {
            updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
          }
          if (subscription.current_period_end) {
            updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString()
          }

          await supabaseAdmin
            .from('subscriptions')
            .update(updateData)
            .eq('stripe_subscription_id', subscription.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const classroomId = subscription.metadata?.classroom_id

        if (classroomId && connectedAccountId) {
          // This is a classroom subscription cancellation
          await handleClassroomSubscriptionDeleted(subscription, classroomId)
        } else {
          // This is a platform subscription cancellation
          const { data } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single()

          if (data?.user_id) {
            await supabaseAdmin
              .from('profiles')
              .update({ subscription_tier: 'free' })
              .eq('id', data.user_id)

            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'canceled', tier: 'free' })
              .eq('stripe_subscription_id', subscription.id)
          }
        }
        break
      }

      // ============================================
      // STRIPE CONNECT ACCOUNT EVENTS
      // ============================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleConnectAccountUpdated(account)
        break
      }

      // ============================================
      // PAYMENT INTENT EVENTS (for one-time content purchases)
      // ============================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const contentId = paymentIntent.metadata?.content_id
        const studentId = paymentIntent.metadata?.student_id

        if (contentId && studentId && connectedAccountId) {
          await handleContentPurchaseCompleted(paymentIntent, studentId, contentId)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

// ============================================
// HANDLER FUNCTIONS
// ============================================

async function handleClassroomSubscriptionCreated(
  session: Stripe.Checkout.Session,
  studentId: string,
  classroomId: string
) {
  if (!supabaseAdmin) return

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Create or update classroom subscription record
  await supabaseAdmin.from('classroom_subscriptions').upsert({
    student_id: studentId,
    classroom_id: classroomId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    status: 'active',
    current_period_start: new Date().toISOString(),
  }, {
    onConflict: 'student_id,classroom_id'
  })

  // Update student's classroom_id
  await supabaseAdmin
    .from('profiles')
    .update({ classroom_id: classroomId })
    .eq('id', studentId)

  console.log(`Classroom subscription created: student=${studentId}, classroom=${classroomId}`)
}

async function handleClassroomSubscriptionUpdated(
  subscription: Stripe.Subscription,
  classroomId: string
) {
  if (!supabaseAdmin) return

  // Map Stripe status to our status
  let status: 'active' | 'cancelled' | 'expired' | 'suspended' | 'past_due' = 'active'
  switch (subscription.status) {
    case 'active':
      status = 'active'
      break
    case 'past_due':
      status = 'past_due'
      break
    case 'canceled':
      status = 'cancelled'
      break
    case 'unpaid':
      status = 'suspended'
      break
    default:
      status = 'active'
  }

  const updateData: Record<string, unknown> = {
    status,
  }

  if (subscription.current_period_start) {
    updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString()
  }
  if (subscription.current_period_end) {
    updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString()
  }

  await supabaseAdmin
    .from('classroom_subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id)

  console.log(`Classroom subscription updated: ${subscription.id}, status=${status}`)
}

async function handleClassroomSubscriptionDeleted(
  subscription: Stripe.Subscription,
  classroomId: string
) {
  if (!supabaseAdmin) return

  // Get the subscription record to find the student
  const { data: subData } = await supabaseAdmin
    .from('classroom_subscriptions')
    .select('student_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (subData?.student_id) {
    // Update subscription status
    await supabaseAdmin
      .from('classroom_subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id)

    // Remove student from classroom
    await supabaseAdmin
      .from('profiles')
      .update({ classroom_id: null })
      .eq('id', subData.student_id)

    console.log(`Classroom subscription deleted: student=${subData.student_id}, classroom=${classroomId}`)
  }
}

async function handleConnectAccountUpdated(account: Stripe.Account) {
  if (!supabaseAdmin) return

  const teacherId = account.metadata?.teacher_id
  if (!teacherId) {
    // Try to find by stripe_account_id
    const { data } = await supabaseAdmin
      .from('teacher_stripe_accounts')
      .select('teacher_id')
      .eq('stripe_account_id', account.id)
      .single()

    if (!data) return
  }

  // Update the teacher's Stripe account status
  await supabaseAdmin
    .from('teacher_stripe_accounts')
    .update({
      charges_enabled: account.charges_enabled === true,
      payouts_enabled: account.payouts_enabled === true,
      onboarding_complete: account.details_submitted === true,
    })
    .eq('stripe_account_id', account.id)

  console.log(`Connect account updated: ${account.id}, charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`)
}

async function handleContentPurchaseCompleted(
  paymentIntent: Stripe.PaymentIntent,
  studentId: string,
  contentId: string
) {
  if (!supabaseAdmin) return

  const amount = paymentIntent.amount / 100
  const platformFee = amount * 0.15
  const teacherPayout = amount - platformFee

  // Create content purchase record
  await supabaseAdmin.from('content_purchases').upsert({
    student_id: studentId,
    content_id: contentId,
    stripe_payment_intent_id: paymentIntent.id,
    amount,
    platform_fee: platformFee,
    teacher_payout: teacherPayout,
    status: 'completed',
  }, {
    onConflict: 'student_id,content_id'
  })

  console.log(`Content purchase completed: student=${studentId}, content=${contentId}, amount=${amount}`)
}
