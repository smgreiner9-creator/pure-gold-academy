import { NextRequest, NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { createClient } from '@supabase/supabase-js'

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-06-20',
// })

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// )

export async function POST(request: NextRequest) {
  try {
    // const body = await request.text()
    // const signature = request.headers.get('stripe-signature')!

    // const event = stripe.webhooks.constructEvent(
    //   body,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET!
    // )

    // switch (event.type) {
    //   case 'checkout.session.completed': {
    //     const session = event.data.object as Stripe.Checkout.Session
    //     const userId = session.metadata?.userId
    //     const customerId = session.customer as string
    //     const subscriptionId = session.subscription as string

    //     await supabase.from('subscriptions').upsert({
    //       user_id: userId,
    //       stripe_customer_id: customerId,
    //       stripe_subscription_id: subscriptionId,
    //       tier: 'premium',
    //       status: 'active',
    //     })

    //     await supabase
    //       .from('profiles')
    //       .update({ subscription_tier: 'premium' })
    //       .eq('id', userId)
    //     break
    //   }

    //   case 'customer.subscription.updated': {
    //     const subscription = event.data.object as Stripe.Subscription
    //     await supabase
    //       .from('subscriptions')
    //       .update({
    //         status: subscription.status,
    //         current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    //         current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    //       })
    //       .eq('stripe_subscription_id', subscription.id)
    //     break
    //   }

    //   case 'customer.subscription.deleted': {
    //     const subscription = event.data.object as Stripe.Subscription
    //     const { data } = await supabase
    //       .from('subscriptions')
    //       .select('user_id')
    //       .eq('stripe_subscription_id', subscription.id)
    //       .single()

    //     if (data?.user_id) {
    //       await supabase
    //         .from('profiles')
    //         .update({ subscription_tier: 'free' })
    //         .eq('id', data.user_id)

    //       await supabase
    //         .from('subscriptions')
    //         .update({ status: 'canceled', tier: 'free' })
    //         .eq('stripe_subscription_id', subscription.id)
    //     }
    //     break
    //   }
    // }

    // Placeholder response
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
