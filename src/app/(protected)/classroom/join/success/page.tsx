'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function JoinSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [isProcessing, setIsProcessing] = useState(true)
  const [classroomName, setClassroomName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const classroomId = searchParams.get('classroom_id')
  const sessionId = searchParams.get('session_id')

  const processJoin = useCallback(async () => {
    if (!profile?.id || !classroomId) return

    try {
      // Get classroom info
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('id', classroomId)
        .single()

      if (!classroom) {
        setError('Classroom not found')
        setIsProcessing(false)
        return
      }

      setClassroomName(classroom.name)

      // Update student's classroom_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ classroom_id: classroomId })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // Create classroom subscription record
      // Note: The webhook will also create this, but we create it here for immediate access
      const { error: subError } = await supabase
        .from('classroom_subscriptions')
        .upsert({
          student_id: profile.id,
          classroom_id: classroomId,
          stripe_subscription_id: sessionId || null,
          status: 'active',
          current_period_start: new Date().toISOString(),
        }, {
          onConflict: 'student_id,classroom_id'
        })

      if (subError) {
        console.error('Error creating subscription record:', subError)
        // Continue anyway - webhook will handle this
      }

      setIsProcessing(false)

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (error) {
      console.error('Error processing join:', error)
      setError('Failed to complete enrollment. Please contact support.')
      setIsProcessing(false)
    }
  }, [classroomId, profile?.id, router, sessionId, supabase])

  useEffect(() => {
    if (profile?.id && classroomId) {
      processJoin()
    }
  }, [profile?.id, classroomId, processJoin])

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)] animate-spin">progress_activity</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Processing Your Enrollment</h1>
          <p className="text-[var(--muted)] text-sm">Please wait while we set up your access...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--danger)]">error</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Something Went Wrong</h1>
          <p className="text-[var(--muted)] text-sm mb-6">{error}</p>
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
      <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome to {classroomName}!</h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          Your subscription is now active. You have full access to all classroom content.
        </p>

        <Link
          href="/dashboard"
          className="gold-gradient text-black font-bold h-12 px-8 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined">dashboard</span>
          Go to Dashboard
        </Link>

        <p className="text-xs text-[var(--muted)] mt-4">
          Redirecting automatically in 3 seconds...
        </p>
      </div>
    </div>
  )
}
