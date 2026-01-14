'use client'

import { useState } from 'react'
import { Card, Button } from '@/components/ui'
import { Crown, Check, CreditCard, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const features = {
  free: [
    'Basic trade journaling',
    'Position size calculator',
    'Session indicator',
    'Community access',
    'Limited content access',
  ],
  premium: [
    'Everything in Free',
    'Unlimited journal entries',
    'Advanced analytics',
    'All premium content',
    'Priority teacher feedback',
    'Export journal data',
    'No ads',
  ],
}

export default function SubscriptionPage() {
  const { profile, isPremium } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      // In production, this would create a Stripe checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_premium_monthly',
          userId: profile?.id,
        }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Subscription setup is not configured. Please set up Stripe integration.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      alert('Billing portal is not configured. Please set up Stripe integration.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Subscription</h1>
          <p className="text-[var(--muted)]">Choose the plan that works for you</p>
        </div>
      </div>

      {isPremium ? (
        <Card className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gold)] flex items-center justify-center">
            <Crown size={32} className="text-black" />
          </div>
          <h2 className="text-2xl font-bold mb-2">You&apos;re on Premium!</h2>
          <p className="text-[var(--muted)] mb-6">
            Enjoy all the premium features
          </p>
          <Button variant="outline" onClick={handleManageSubscription} isLoading={isLoading}>
            <CreditCard size={18} />
            Manage Billing
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className="relative">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <p className="text-3xl font-bold mb-4">
              $0<span className="text-sm text-[var(--muted)] font-normal">/month</span>
            </p>
            <ul className="space-y-3 mb-6">
              {features.free.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check size={16} className="text-[var(--success)]" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" disabled className="w-full">
              Current Plan
            </Button>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-[var(--gold)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 rounded-full bg-[var(--gold)] text-black text-sm font-semibold">
                Recommended
              </span>
            </div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Crown size={20} className="text-[var(--gold)]" />
              Premium
            </h3>
            <p className="text-3xl font-bold mb-4">
              $2.80<span className="text-sm text-[var(--muted)] font-normal">/month</span>
            </p>
            <ul className="space-y-3 mb-6">
              {features.premium.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check size={16} className="text-[var(--gold)]" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button onClick={handleSubscribe} isLoading={isLoading} className="w-full">
              Upgrade to Premium
            </Button>
          </Card>
        </div>
      )}

      {/* Teacher Pricing Note */}
      {profile?.role === 'teacher' && (
        <Card className="bg-[var(--gold)]/5 border-[var(--gold)]/20">
          <h4 className="font-semibold mb-2">Teacher Pricing</h4>
          <p className="text-sm text-[var(--muted)]">
            Teachers: $350 one-time setup fee + $2.80 per active student monthly.
            Contact support to set up your teacher account billing.
          </p>
        </Card>
      )}
    </div>
  )
}
