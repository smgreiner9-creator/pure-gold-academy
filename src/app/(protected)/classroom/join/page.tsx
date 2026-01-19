'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function JoinClassroomPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [classroomCode, setClassroomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // If already in classroom, redirect
  if (profile?.classroom_id) {
    router.push('/dashboard')
    return null
  }

  const joinClassroom = async () => {
    if (!profile?.id || !classroomCode.trim()) return

    setIsJoining(true)
    setError(null)
    try {
      const { data: classroom, error: findError } = await supabase
        .from('classrooms')
        .select('id, invite_code')
        .eq('invite_code', classroomCode.trim().toLowerCase())
        .single()

      if (findError || !classroom) {
        setError('Invalid invite code. Please check and try again.')
        setIsJoining(false)
        return
      }

      // Redirect to the join page with code to handle free/paid flow
      router.push(`/classroom/join/${classroom.invite_code}`)
    } catch (err) {
      console.error('Error finding classroom:', err)
      setError('Failed to find classroom')
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Join a Classroom</h1>
          <p className="text-[var(--muted)] text-sm">
            Enter the invite code from your teacher to access exclusive content and community features
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            value={classroomCode}
            onChange={(e) => setClassroomCode(e.target.value)}
            placeholder="Enter invite code (e.g., abc123)"
            className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors text-center uppercase tracking-widest"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && classroomCode.trim()) {
                joinClassroom()
              }
            }}
          />
          <button
            onClick={joinClassroom}
            disabled={isJoining || !classroomCode.trim()}
            className="w-full gold-gradient text-black font-bold h-12 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
          >
            {isJoining ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Finding Classroom...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">group_add</span>
                Join Classroom
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-[var(--muted)] hover:text-white text-sm transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
