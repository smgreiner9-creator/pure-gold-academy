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

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
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
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const updateData: Record<string, unknown> = { status: subscription.status }

        // Handle period dates if available
        if ('current_period_start' in subscription && subscription.current_period_start) {
          updateData.current_period_start = new Date((subscription.current_period_start as number) * 1000).toISOString()
        }
        if ('current_period_end' in subscription && subscription.current_period_end) {
          updateData.current_period_end = new Date((subscription.current_period_end as number) * 1000).toISOString()
        }

        await supabaseAdmin
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
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
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
