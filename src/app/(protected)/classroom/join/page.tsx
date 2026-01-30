'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom } from '@/types/database'

export default function JoinClassroomPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [classroomCode, setClassroomCode] = useState('')
  const [publicClassrooms, setPublicClassrooms] = useState<(Classroom & { pricing?: { pricing_type: string; monthly_price: number } })[]>([])
  const [showPublic, setShowPublic] = useState(false)
  const [isLoadingPublic, setIsLoadingPublic] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const isInClassroom = Boolean(profile?.classroom_id)

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

  const loadPublicClassrooms = async () => {
    const [classroomsRes, pricingRes] = await Promise.all([
      supabase
        .from('classrooms')
        .select('id, name, description, invite_code, is_public')
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('classroom_pricing')
        .select('classroom_id, pricing_type, monthly_price')
    ])

    const pricingMap = new Map<string, { pricing_type: string; monthly_price: number }>()
    ;(pricingRes.data || []).forEach(p => {
      pricingMap.set(p.classroom_id, { pricing_type: p.pricing_type, monthly_price: p.monthly_price })
    })

    const classrooms = (classroomsRes.data || []).map(classroom => ({
      ...classroom,
      pricing: pricingMap.get(classroom.id)
    }))

    setPublicClassrooms(classrooms as (Classroom & { pricing?: { pricing_type: string; monthly_price: number } })[])
  }

  useEffect(() => {
    if (isInClassroom) {
      router.push('/journal')
    }
  }, [isInClassroom, router])

  if (isInClassroom) return null

  return (
    <div className="min-h-[60vh] space-y-8">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md p-6 rounded-2xl glass-surface">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Join a Strategy</h1>
            <p className="text-[var(--muted)] text-sm">
              Enter the invite code from your teacher to access the strategy and community.
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
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors text-center uppercase tracking-widest"
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
                  Finding Strategy...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">group_add</span>
                  Join Strategy
                </>
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/journal" className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Public Strategies</h2>
            <p className="text-sm text-[var(--muted)]">Discover strategies available to join.</p>
          </div>
          <button
            onClick={async () => {
              if (!showPublic) {
                setShowPublic(true)
              }
              if (publicClassrooms.length === 0) {
                setIsLoadingPublic(true)
                await loadPublicClassrooms()
                setIsLoadingPublic(false)
              }
            }}
            className="h-10 px-4 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] font-semibold hover:bg-[var(--gold)]/10 transition-colors text-sm w-fit"
          >
            {showPublic ? 'Refresh List' : 'Browse Public Strategies'}
          </button>
        </div>

        {showPublic && (
          <>
            {isLoadingPublic ? (
              <div className="p-6 rounded-2xl glass-surface animate-pulse h-28" />
            ) : publicClassrooms.length === 0 ? (
              <div className="p-6 rounded-2xl glass-surface text-sm text-[var(--muted)] text-center">
                No public strategies available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicClassrooms.map(classroom => (
                  <div
                    key={classroom.id}
                    className="p-6 rounded-2xl glass-surface"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{classroom.name}</h3>
                        {classroom.description && (
                          <p className="text-sm text-[var(--muted)] mt-1">{classroom.description}</p>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-lg">
                        <span className="material-symbols-outlined text-sm">public</span>
                        Public
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      {classroom.pricing?.pricing_type === 'paid' ? (
                        <span className="text-sm text-[var(--gold)] font-semibold">
                          ${classroom.pricing.monthly_price}/month
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">Free</span>
                      )}
                      <button
                        onClick={() => router.push(`/classroom/join/${classroom.invite_code}`)}
                        className="h-9 px-4 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] font-semibold hover:bg-[var(--gold)]/10 transition-colors text-sm"
                      >
                        View & Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
