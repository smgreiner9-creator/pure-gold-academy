'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, ClassroomPricing, Profile } from '@/types/database'

interface ClassroomWithTeacher extends Classroom {
  teacher?: Pick<Profile, 'display_name' | 'email'>
}

export default function JoinClassroomPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = params.code as string
  const { profile } = useAuth()
  const [classroom, setClassroom] = useState<ClassroomWithTeacher | null>(null)
  const [pricing, setPricing] = useState<ClassroomPricing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const cancelled = searchParams.get('cancelled') === 'true'

  const loadClassroom = useCallback(async () => {
    try {
      // Find classroom by invite code
      const { data: classroomData, error: findError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('invite_code', inviteCode.toLowerCase())
        .single()

      if (findError || !classroomData) {
        setError('Invalid invite code. Please check and try again.')
        setIsLoading(false)
        return
      }

      // Get teacher info
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', classroomData.teacher_id)
        .single()

      setClassroom({
        ...classroomData,
        teacher: teacherData || undefined
      })

      // Get pricing info
      const { data: pricingData } = await supabase
        .from('classroom_pricing')
        .select('*')
        .eq('classroom_id', classroomData.id)
        .single()

      setPricing(pricingData)
    } catch (error) {
      console.error('Error loading classroom:', error)
      setError('Failed to load classroom info')
    } finally {
      setIsLoading(false)
    }
  }, [inviteCode, supabase])

  useEffect(() => {
    if (inviteCode) {
      loadClassroom()
    }
  }, [inviteCode, loadClassroom])

  const handleJoinFree = async () => {
    if (!profile?.id || !classroom) return

    setIsJoining(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ classroom_id: classroom.id })
        .eq('id', profile.id)

      if (error) throw error

      router.push('/dashboard?joined=true')
    } catch (error) {
      console.error('Error joining classroom:', error)
      setError('Failed to join classroom')
    } finally {
      setIsJoining(false)
    }
  }

  const handleSubscribe = async () => {
    if (!profile?.id || !classroom) return

    setIsJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/connect/checkout/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: classroom.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setIsJoining(false)
    }
  }

  const isPaid = pricing?.pricing_type === 'paid' && pricing.monthly_price > 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse">
          <div className="h-8 bg-white/10 rounded mb-4" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error && !classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--danger)]">error</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Invalid Invite Code</h1>
          <p className="text-[var(--muted)] text-sm mb-6">{error}</p>
          <Link
            href="/settings"
            className="text-[var(--gold)] hover:underline text-sm"
          >
            Back to Settings
          </Link>
        </div>
      </div>
    )
  }

  if (profile?.classroom_id === classroom?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Already Enrolled</h1>
          <p className="text-[var(--muted)] text-sm mb-6">
            You&apos;re already a member of {classroom?.name}
          </p>
          <Link
            href="/dashboard"
            className="gold-gradient text-black font-bold h-11 px-6 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Cancelled Message */}
        {cancelled && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--warning)]">info</span>
            <p className="text-sm">Payment was cancelled. You can try again when ready.</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--danger)]">error</span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          {/* Classroom Info */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{classroom?.name}</h1>
            {classroom?.description && (
              <p className="text-[var(--muted)] text-sm">{classroom.description}</p>
            )}
            {classroom?.teacher && (
              <p className="text-sm text-[var(--muted)] mt-2">
                by {classroom.teacher.display_name || classroom.teacher.email}
              </p>
            )}
          </div>

          {/* Pricing Info */}
          {isPaid ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black/30 text-center">
                <p className="text-sm text-[var(--muted)] mb-1">Monthly Subscription</p>
                <p className="text-3xl font-bold text-[var(--gold)]">
                  ${pricing?.monthly_price}
                  <span className="text-sm font-normal text-[var(--muted)]">/month</span>
                </p>
                {pricing?.trial_days && pricing.trial_days > 0 && (
                  <p className="text-sm text-[var(--success)] mt-2">
                    {pricing.trial_days} day free trial included
                  </p>
                )}
              </div>

              <button
                onClick={handleSubscribe}
                disabled={isJoining}
                className="w-full gold-gradient text-black font-bold h-12 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isJoining ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">credit_card</span>
                    Subscribe Now
                  </>
                )}
              </button>

              <p className="text-xs text-center text-[var(--muted)]">
                Secure payment powered by Stripe. Cancel anytime.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-center">
                <span className="material-symbols-outlined text-2xl text-[var(--success)] mb-2">lock_open</span>
                <p className="font-semibold text-[var(--success)]">Free Classroom</p>
                <p className="text-sm text-[var(--muted)] mt-1">No payment required</p>
              </div>

              <button
                onClick={handleJoinFree}
                disabled={isJoining}
                className="w-full gold-gradient text-black font-bold h-12 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isJoining ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Joining...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">group_add</span>
                    Join Classroom
                  </>
                )}
              </button>
            </div>
          )}

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link
              href="/settings"
              className="text-[var(--muted)] hover:text-white text-sm transition-colors"
            >
              Back to Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
