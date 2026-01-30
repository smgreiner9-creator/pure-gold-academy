'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export default function JoinSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [status, setStatus] = useState<'polling' | 'active' | 'failed'>('polling')
  const [classroomName, setClassroomName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortedRef = useRef(false)

  const classroomId = searchParams.get('classroom_id')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!classroomId || !sessionId) {
      setStatus('failed')
      setError('Invalid enrollment link. Missing required parameters.')
      return
    }

    if (!profile?.id) return

    abortedRef.current = false
    let pollCount = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      if (abortedRef.current) return

      try {
        const res = await fetch(
          `/api/stripe/connect/verify-session?session_id=${encodeURIComponent(sessionId)}&classroom_id=${encodeURIComponent(classroomId)}`
        )
        if (abortedRef.current) return

        const data = await res.json()

        if (!res.ok) {
          setStatus('failed')
          setError(data.error || 'Verification failed')
          return
        }

        if (data.status === 'active') {
          setClassroomName(data.classroom_name)
          setStatus('active')
          setTimeout(() => {
            router.push('/journal')
          }, 3000)
          return
        }

        if (data.status === 'failed') {
          setStatus('failed')
          setError(data.error || 'Payment verification failed')
          return
        }

        // Still pending — poll again if under limit
        pollCount++
        if (pollCount >= 20) {
          setStatus('failed')
          setError('Enrollment is taking longer than expected. Your payment was received — please refresh the page or contact support if access is not granted shortly.')
          return
        }

        timer = setTimeout(poll, 2000)
      } catch {
        if (!abortedRef.current) {
          setStatus('failed')
          setError('Network error. Please check your connection and refresh the page.')
        }
      }
    }

    poll()

    return () => {
      abortedRef.current = true
      if (timer) clearTimeout(timer)
    }
  }, [profile?.id, classroomId, sessionId, router])

  if (status === 'polling') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-2xl glass-surface text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)] animate-spin">progress_activity</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Processing Your Enrollment</h1>
          <p className="text-[var(--muted)] text-sm">Confirming your payment and setting up access...</p>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-2xl glass-surface text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--danger)]">error</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Something Went Wrong</h1>
          <p className="text-[var(--muted)] text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              href="/journal"
              className="gold-gradient text-black font-bold h-11 px-6 rounded-xl inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
            >
              Go to Dashboard
            </Link>
            <p className="text-xs text-[var(--muted)]">
              Need help? Contact support at support@puregold.academy
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 rounded-2xl glass-surface text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome to {classroomName}!</h1>
        <p className="text-[var(--muted)] text-sm mb-6">
          Your subscription is now active. You have full access to all classroom content.
        </p>

        <Link
          href="/journal"
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
