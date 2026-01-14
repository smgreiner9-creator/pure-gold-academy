import { NextRequest, NextResponse } from 'next/server'
// import Stripe from 'stripe'
// import { createClient } from '@/lib/supabase/server'

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-06-20',
// })

export async function POST(request: NextRequest) {
  try {
    // const { priceId, userId } = await request.json()

    // In production, uncomment and use this code:
    // const supabase = await createClient()
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('email')
    //   .eq('id', userId)
    //   .single()

    // const session = await stripe.checkout.sessions.create({
    //   mode: 'subscription',
    //   payment_method_types: ['card'],
    //   line_items: [
    //     {
    //       price: priceId,
    //       quantity: 1,
    //     },
    //   ],
    //   success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?success=true`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?canceled=true`,
    //   customer_email: profile?.email,
    //   metadata: {
    //     userId,
    //   },
    // })

    // return NextResponse.json({ url: session.url })

    // Placeholder response
    return NextResponse.json({
      error: 'Stripe integration not configured. Please add STRIPE_SECRET_KEY to environment variables.',
    }, { status: 501 })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
