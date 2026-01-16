import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null

export async function GET() {
  try {
    if (!stripe) {
      return NextResponse.json({
        connected: false,
        error: 'Stripe not configured',
      })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can check Stripe status' }, { status: 403 })
    }

    // Get Stripe account from database
    const { data: stripeAccount } = await supabase
      .from('teacher_stripe_accounts')
      .select('*')
      .eq('teacher_id', profile.id)
      .single()

    if (!stripeAccount?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
      })
    }

    // Get account status from Stripe
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id)

    // Update database with latest status
    const isOnboardingComplete = account.details_submitted === true
    const chargesEnabled = account.charges_enabled === true
    const payoutsEnabled = account.payouts_enabled === true

    await supabase
      .from('teacher_stripe_accounts')
      .update({
        onboarding_complete: isOnboardingComplete,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
      })
      .eq('teacher_id', profile.id)

    return NextResponse.json({
      connected: true,
      onboarding_complete: isOnboardingComplete,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      account_id: stripeAccount.stripe_account_id,
    })
  } catch (error) {
    console.error('Stripe Connect status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
