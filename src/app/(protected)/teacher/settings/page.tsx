'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface StripeStatus {
  connected: boolean
  onboarding_complete: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  account_id?: string
  error?: string
}

export default function TeacherSettingsPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  const stripeSuccess = searchParams.get('stripe_success')
  const stripeRefresh = searchParams.get('stripe_refresh')

  useEffect(() => {
    if (profile?.id) {
      fetchStripeStatus()
    }
  }, [profile?.id])

  // Auto-refresh on return from Stripe
  useEffect(() => {
    if (stripeSuccess === 'true' || stripeRefresh === 'true') {
      fetchStripeStatus()
    }
  }, [stripeSuccess, stripeRefresh])

  const fetchStripeStatus = async () => {
    try {
      const res = await fetch('/api/stripe/connect/status')
      const data = await res.json()
      setStripeStatus(data)
    } catch (error) {
      console.error('Error fetching Stripe status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectStripe = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No onboarding URL returned')
        setIsConnecting(false)
      }
    } catch (error) {
      console.error('Error starting Stripe onboarding:', error)
      setIsConnecting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-48" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-white transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Teacher Settings</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Manage your payments and account settings</p>
      </div>

      {/* Success Message */}
      {stripeSuccess === 'true' && (
        <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--success)]">check_circle</span>
          <p className="text-sm">Stripe account connected successfully! You can now set prices on your classrooms and content.</p>
        </div>
      )}

      {/* Stripe Connect Card */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#635BFF">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">Stripe Connect</h2>
            <p className="text-[var(--muted)] text-sm mt-1">
              Connect your Stripe account to receive payments from students
            </p>

            {/* Status Display */}
            <div className="mt-4 space-y-2">
              {stripeStatus?.connected ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stripeStatus.charges_enabled ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                    <span className="text-sm">
                      {stripeStatus.charges_enabled ? 'Payments enabled' : 'Payments pending setup'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stripeStatus.payouts_enabled ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                    <span className="text-sm">
                      {stripeStatus.payouts_enabled ? 'Payouts enabled' : 'Payouts pending setup'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stripeStatus.onboarding_complete ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                    <span className="text-sm">
                      {stripeStatus.onboarding_complete ? 'Onboarding complete' : 'Onboarding incomplete'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)]" />
                  <span className="text-sm text-[var(--muted)]">Not connected</span>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6">
              {stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-[var(--success)] text-sm font-semibold">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Connected
                  </span>
                  <button
                    onClick={handleConnectStripe}
                    className="text-sm text-[var(--muted)] hover:text-white transition-colors"
                  >
                    Update account
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectStripe}
                  disabled={isConnecting}
                  className="h-10 px-6 rounded-lg bg-[#635BFF] text-white font-semibold hover:bg-[#5851ea] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Connecting...
                    </>
                  ) : stripeStatus?.connected ? (
                    <>
                      <span className="material-symbols-outlined text-lg">refresh</span>
                      Complete Setup
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">link</span>
                      Connect Stripe
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--gold)]">info</span>
          How it works
        </h3>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">1.</span>
            Connect your Stripe account to enable payments
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">2.</span>
            Set monthly subscription prices on your classrooms
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">3.</span>
            Optionally set one-time prices on individual content
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">4.</span>
            Students pay through Stripe Checkout - funds go directly to your account
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">5.</span>
            Platform fee of 15% is automatically deducted
          </li>
        </ul>
      </div>

      {/* Quick Links */}
      {stripeStatus?.connected && stripeStatus?.charges_enabled && (
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/teacher/classrooms"
            className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/50 transition-colors group"
          >
            <span className="material-symbols-outlined text-2xl text-[var(--gold)] mb-2">school</span>
            <p className="font-semibold group-hover:text-[var(--gold)] transition-colors">Set Classroom Prices</p>
            <p className="text-xs text-[var(--muted)] mt-1">Configure subscription pricing</p>
          </Link>
          <Link
            href="/teacher/content"
            className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/50 transition-colors group"
          >
            <span className="material-symbols-outlined text-2xl text-[var(--gold)] mb-2">video_library</span>
            <p className="font-semibold group-hover:text-[var(--gold)] transition-colors">Set Content Prices</p>
            <p className="text-xs text-[var(--muted)] mt-1">Sell individual content</p>
          </Link>
        </div>
      )}
    </div>
  )
}
