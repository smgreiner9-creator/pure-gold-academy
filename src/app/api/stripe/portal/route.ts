import { NextRequest, NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { createClient } from '@/lib/supabase/server'

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-06-20',
// })

export async function POST(request: NextRequest) {
  try {
    // const { userId } = await request.json()

    // In production, uncomment and use this code:
    // const supabase = await createClient()
    // const { data: subscription } = await supabase
    //   .from('subscriptions')
    //   .select('stripe_customer_id')
    //   .eq('user_id', userId)
    //   .single()

    // if (!subscription?.stripe_customer_id) {
    //   return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    // }

    // const session = await stripe.billingPortal.sessions.create({
    //   customer: subscription.stripe_customer_id,
    //   return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`,
    // })

    // return NextResponse.json({ url: session.url })

    // Placeholder response
    return NextResponse.json({
      error: 'Stripe integration not configured. Please add STRIPE_SECRET_KEY to environment variables.',
    }, { status: 501 })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
