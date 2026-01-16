import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' })
  : null

// GET: Fetch classroom pricing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classroomId = searchParams.get('classroom_id')

    if (!classroomId) {
      return NextResponse.json({ error: 'Classroom ID required' }, { status: 400 })
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
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can manage pricing' }, { status: 403 })
    }

    // Verify classroom belongs to this teacher
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', classroomId)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 })
    }

    // Get pricing settings
    const { data: pricing } = await supabase
      .from('classroom_pricing')
      .select('*')
      .eq('classroom_id', classroomId)
      .single()

    return NextResponse.json({
      pricing: pricing || {
        pricing_type: 'free',
        monthly_price: 0,
        currency: 'USD',
        trial_days: 0,
        is_active: true
      }
    })
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
  }
}

// POST: Create or update classroom pricing
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

    // Get profile and verify teacher role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can manage pricing' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { classroom_id, pricing_type, monthly_price, trial_days } = body

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom ID required' }, { status: 400 })
    }

    // Verify classroom belongs to this teacher
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, name, teacher_id')
      .eq('id', classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 404 })
    }

    // If setting to paid, verify Stripe Connect is complete
    if (pricing_type === 'paid') {
      const { data: stripeAccount } = await supabase
        .from('teacher_stripe_accounts')
        .select('*')
        .eq('teacher_id', profile.id)
        .single()

      if (!stripeAccount?.charges_enabled) {
        return NextResponse.json({
          error: 'You must complete Stripe Connect setup before setting paid pricing'
        }, { status: 400 })
      }

      // Validate price
      if (!monthly_price || monthly_price < 1) {
        return NextResponse.json({
          error: 'Monthly price must be at least $1.00'
        }, { status: 400 })
      }
    }

    // Get existing pricing to check if we need to create/update Stripe price
    const { data: existingPricing } = await supabase
      .from('classroom_pricing')
      .select('*')
      .eq('classroom_id', classroom_id)
      .single()

    let stripePriceId = existingPricing?.stripe_price_id

    // Create Stripe Price if setting to paid (or price changed)
    if (pricing_type === 'paid' && monthly_price > 0) {
      const priceInCents = Math.round(monthly_price * 100)

      // Get teacher's Stripe account
      const { data: stripeAccount } = await supabase
        .from('teacher_stripe_accounts')
        .select('stripe_account_id')
        .eq('teacher_id', profile.id)
        .single()

      if (stripeAccount?.stripe_account_id) {
        // Check if price changed - if so, create new price
        const priceChanged = !existingPricing ||
          existingPricing.monthly_price !== monthly_price ||
          existingPricing.pricing_type !== 'paid'

        if (priceChanged) {
          // First, create or get the product
          let productId: string

          // Search for existing product
          const products = await stripe.products.list({
            limit: 1,
          }, {
            stripeAccount: stripeAccount.stripe_account_id,
          })

          const existingProduct = products.data.find(p =>
            p.metadata?.classroom_id === classroom_id
          )

          if (existingProduct) {
            productId = existingProduct.id
            // Update product name if changed
            await stripe.products.update(productId, {
              name: `${classroom.name} - Monthly Subscription`,
            }, {
              stripeAccount: stripeAccount.stripe_account_id,
            })
          } else {
            // Create product on connected account
            const product = await stripe.products.create({
              name: `${classroom.name} - Monthly Subscription`,
              metadata: {
                classroom_id: classroom_id,
                teacher_id: profile.id,
              },
            }, {
              stripeAccount: stripeAccount.stripe_account_id,
            })
            productId = product.id
          }

          // Create new price (prices are immutable in Stripe)
          const price = await stripe.prices.create({
            product: productId,
            unit_amount: priceInCents,
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
            metadata: {
              classroom_id: classroom_id,
            },
          }, {
            stripeAccount: stripeAccount.stripe_account_id,
          })

          stripePriceId = price.id

          // Deactivate old price if exists
          if (existingPricing?.stripe_price_id) {
            try {
              await stripe.prices.update(existingPricing.stripe_price_id, {
                active: false,
              }, {
                stripeAccount: stripeAccount.stripe_account_id,
              })
            } catch {
              // Ignore errors deactivating old price
            }
          }
        }
      }
    }

    // Upsert pricing settings
    const pricingData = {
      classroom_id,
      pricing_type: pricing_type || 'free',
      monthly_price: pricing_type === 'paid' ? monthly_price : 0,
      currency: 'USD',
      stripe_price_id: pricing_type === 'paid' ? stripePriceId : null,
      trial_days: trial_days || 0,
      is_active: true,
    }

    if (existingPricing) {
      await supabase
        .from('classroom_pricing')
        .update(pricingData)
        .eq('classroom_id', classroom_id)
    } else {
      await supabase
        .from('classroom_pricing')
        .insert(pricingData)
    }

    // Update classroom is_paid flag
    await supabase
      .from('classrooms')
      .update({ is_paid: pricing_type === 'paid' })
      .eq('id', classroom_id)

    return NextResponse.json({
      success: true,
      pricing: pricingData
    })
  } catch (error) {
    console.error('Error saving pricing:', error)
    return NextResponse.json({ error: 'Failed to save pricing' }, { status: 500 })
  }
}
