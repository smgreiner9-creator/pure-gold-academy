import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({
        error: 'Stripe not configured',
      }, { status: 501 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile and verify teacher role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role, display_name')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can connect Stripe' }, { status: 403 })
    }

    // Check if teacher already has a Stripe account
    const { data: existingAccount } = await supabase
      .from('teacher_stripe_accounts')
      .select('*')
      .eq('teacher_id', profile.id)
      .single()

    let stripeAccountId: string

    if (existingAccount?.stripe_account_id) {
      // Use existing account
      stripeAccountId = existingAccount.stripe_account_id
    } else {
      // Create new Connect account (Express type for easier onboarding)
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        metadata: {
          teacher_id: profile.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: profile.display_name || profile.email,
          product_description: 'Online trading education courses and content',
        },
      })

      stripeAccountId = account.id

      // Save to database
      if (existingAccount) {
        await supabase
          .from('teacher_stripe_accounts')
          .update({ stripe_account_id: stripeAccountId })
          .eq('teacher_id', profile.id)
      } else {
        await supabase
          .from('teacher_stripe_accounts')
          .insert({
            teacher_id: profile.id,
            stripe_account_id: stripeAccountId,
          })
      }
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/teacher/settings?stripe_refresh=true`,
      return_url: `${baseUrl}/teacher/settings?stripe_success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error)
    return NextResponse.json({ error: 'Failed to start onboarding' }, { status: 500 })
  }
}
