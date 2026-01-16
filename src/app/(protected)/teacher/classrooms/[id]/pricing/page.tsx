'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, ClassroomPricing, TeacherStripeAccount } from '@/types/database'

export default function ClassroomPricingPage() {
  const params = useParams()
  const classroomId = params.id as string
  const { profile } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [stripeAccount, setStripeAccount] = useState<TeacherStripeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pricingType, setPricingType] = useState<'free' | 'paid'>('free')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [trialDays, setTrialDays] = useState('0')

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id && classroomId) {
      loadData()
    }
  }, [profile?.id, classroomId])

  const loadData = async () => {
    if (!profile?.id) return

    try {
      // Load classroom, stripe account, and pricing in parallel
      const [classroomRes, stripeRes, pricingRes] = await Promise.all([
        supabase
          .from('classrooms')
          .select('*')
          .eq('id', classroomId)
          .eq('teacher_id', profile.id)
          .single(),
        supabase
          .from('teacher_stripe_accounts')
          .select('*')
          .eq('teacher_id', profile.id)
          .single(),
        fetch(`/api/stripe/connect/pricing?classroom_id=${classroomId}`)
          .then(res => res.json())
      ])

      if (classroomRes.data) {
        setClassroom(classroomRes.data)
      }

      if (stripeRes.data) {
        setStripeAccount(stripeRes.data)
      }

      if (pricingRes.pricing) {
        setPricingType(pricingRes.pricing.pricing_type || 'free')
        setMonthlyPrice(pricingRes.pricing.monthly_price?.toString() || '')
        setTrialDays(pricingRes.pricing.trial_days?.toString() || '0')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSaveSuccess(false)

    if (pricingType === 'paid') {
      const price = parseFloat(monthlyPrice)
      if (isNaN(price) || price < 1) {
        setError('Monthly price must be at least $1.00')
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/stripe/connect/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          pricing_type: pricingType,
          monthly_price: pricingType === 'paid' ? parseFloat(monthlyPrice) : 0,
          trial_days: parseInt(trialDays) || 0,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save pricing')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pricing')
    } finally {
      setIsSaving(false)
    }
  }

  const canSetPaidPricing = stripeAccount?.charges_enabled === true

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-48" />
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4">school</span>
          <h3 className="text-xl font-bold mb-2">Classroom Not Found</h3>
          <p className="text-[var(--muted)] mb-4">This classroom may have been deleted or you don&apos;t have access.</p>
          <Link href="/teacher/classrooms" className="text-[var(--gold)] hover:underline">
            Back to Classrooms
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href={`/teacher/classrooms/${classroomId}`}
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-white transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to {classroom.name}
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Pricing Settings</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Set subscription pricing for {classroom.name}</p>
      </div>

      {/* Stripe Connect Warning */}
      {!canSetPaidPricing && (
        <div className="p-4 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 flex items-start gap-3">
          <span className="material-symbols-outlined text-[var(--warning)] shrink-0">warning</span>
          <div>
            <p className="text-sm font-semibold">Stripe Connect Required</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              You need to connect your Stripe account before setting paid pricing.
            </p>
            <Link
              href="/teacher/settings"
              className="inline-flex items-center gap-1 text-[var(--gold)] text-sm mt-2 hover:underline"
            >
              Connect Stripe
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--success)]">check_circle</span>
          <p className="text-sm">Pricing settings saved successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--danger)]">error</span>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Pricing Type Selection */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h2 className="font-bold text-lg mb-4">Access Type</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setPricingType('free')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              pricingType === 'free'
                ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                : 'border-[var(--card-border)] hover:border-[var(--gold)]/50'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">lock_open</span>
              <span className="font-bold">Free</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Students join with invite code only
            </p>
          </button>

          <button
            onClick={() => canSetPaidPricing && setPricingType('paid')}
            disabled={!canSetPaidPricing}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              pricingType === 'paid'
                ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                : 'border-[var(--card-border)] hover:border-[var(--gold)]/50'
            } ${!canSetPaidPricing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">paid</span>
              <span className="font-bold">Paid</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Monthly subscription required
            </p>
          </button>
        </div>
      </div>

      {/* Pricing Details (only show if paid) */}
      {pricingType === 'paid' && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] space-y-6">
          <h2 className="font-bold text-lg">Subscription Details</h2>

          {/* Monthly Price */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Monthly Price (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
              <input
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                placeholder="0.00"
                min="1"
                step="0.01"
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
              />
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              Minimum $1.00. Platform fee of 15% will be deducted from each payment.
            </p>
          </div>

          {/* Trial Days */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Free Trial Days (Optional)
            </label>
            <input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              placeholder="0"
              min="0"
              max="30"
              className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
            />
            <p className="text-xs text-[var(--muted)] mt-2">
              Students can try your classroom free for this many days (max 30).
            </p>
          </div>

          {/* Price Preview */}
          {monthlyPrice && parseFloat(monthlyPrice) >= 1 && (
            <div className="p-4 rounded-xl bg-black/30">
              <h3 className="text-sm font-semibold mb-3">Revenue Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Monthly price</span>
                  <span>${parseFloat(monthlyPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Platform fee (15%)</span>
                  <span className="text-[var(--danger)]">-${(parseFloat(monthlyPrice) * 0.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--card-border)]">
                  <span className="font-semibold">Your earnings</span>
                  <span className="text-[var(--success)] font-semibold">${(parseFloat(monthlyPrice) * 0.85).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link
          href={`/teacher/classrooms/${classroomId}`}
          className="h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-11 px-6 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
          Save Pricing
        </button>
      </div>

      {/* Info Card */}
      <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--gold)]">info</span>
          How Paid Classrooms Work
        </h3>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">1.</span>
            Students enter your invite code to view classroom details
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">2.</span>
            They see the monthly price and can start a subscription
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">3.</span>
            Payment is processed through Stripe Checkout
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">4.</span>
            Once paid, they get full access to your classroom content
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">5.</span>
            Subscriptions auto-renew monthly until cancelled
          </li>
        </ul>
      </div>
    </div>
  )
}
