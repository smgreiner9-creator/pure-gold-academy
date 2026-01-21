'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom } from '@/types/database'

export default function ClassroomsPage() {
  const { profile } = useAuth()
  const [classrooms, setClassrooms] = useState<(Classroom & { student_count?: number; pricing?: { pricing_type: string; monthly_price: number } })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadClassrooms = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Load classrooms, student counts, and pricing in parallel
      const [classroomsRes, studentsRes, pricingRes] = await Promise.all([
        supabase
          .from('classrooms')
          .select('*')
          .eq('teacher_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('classroom_id')
          .eq('role', 'student')
          .not('classroom_id', 'is', null),
        supabase
          .from('classroom_pricing')
          .select('classroom_id, pricing_type, monthly_price')
      ])

      const classroomsData = classroomsRes.data || []
      const studentsData = studentsRes.data || []
      const pricingData = pricingRes.data || []

      // Count students per classroom
      const studentCounts = new Map<string, number>()
      studentsData.forEach(s => {
        if (s.classroom_id) {
          studentCounts.set(s.classroom_id, (studentCounts.get(s.classroom_id) || 0) + 1)
        }
      })

      // Map pricing by classroom
      const pricingByClassroom = new Map<string, { pricing_type: string; monthly_price: number }>()
      pricingData.forEach(p => {
        pricingByClassroom.set(p.classroom_id, { pricing_type: p.pricing_type, monthly_price: p.monthly_price })
      })

      // Add student counts and pricing to classrooms
      const classroomsWithData = classroomsData.map(classroom => ({
        ...classroom,
        student_count: studentCounts.get(classroom.id) || 0,
        pricing: pricingByClassroom.get(classroom.id)
      }))

      setClassrooms(classroomsWithData)
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadClassrooms()
    }
  }, [profile?.id, loadClassrooms])

  const deleteClassroom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classroom? All students will be removed from it.')) return

    try {
      await supabase.from('classrooms').delete().eq('id', id)
      setClassrooms(classrooms.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting classroom:', error)
    }
  }

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2].map(i => (
          <div key={i} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Strategies</h1>
          <p className="text-[var(--muted)] text-sm">Create and manage your trading strategies</p>
        </div>
        <Link
          href="/teacher/strategy/new"
          className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm w-fit"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Strategy
        </Link>
      </div>

      {classrooms.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Strategies Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Create a strategy to start teaching students
          </p>
          <Link
            href="/teacher/strategy/new"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Strategy
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {classrooms.map(classroom => (
            <div
              key={classroom.id}
              className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl text-[var(--gold)]">school</span>
                  </div>
                  <div>
                    <Link href={`/teacher/classrooms/${classroom.id}`} className="font-bold text-lg hover:text-[var(--gold)] transition-colors">
                      {classroom.name}
                    </Link>
                    {classroom.description && (
                      <p className="text-sm text-[var(--muted)] mt-1">{classroom.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      {classroom.is_public ? (
                        <span className="flex items-center gap-1.5 text-sm text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined text-sm">public</span>
                          Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-[var(--muted)] bg-white/5 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined text-sm">lock</span>
                          Private
                        </span>
                      )}
                      {classroom.pricing?.pricing_type === 'paid' ? (
                        <span className="flex items-center gap-1.5 text-sm text-[var(--gold)] bg-[var(--gold)]/10 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined text-sm">paid</span>
                          ${classroom.pricing.monthly_price}/mo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-[var(--muted)] bg-white/5 px-2 py-0.5 rounded-lg">
                          <span className="material-symbols-outlined text-sm">lock_open</span>
                          Free
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                        <span className="material-symbols-outlined text-sm">group</span>
                        {classroom.student_count} students
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--muted)]">Invite code:</span>
                        <code className="px-2 py-1 rounded-lg bg-black/40 text-[var(--gold)] font-mono text-sm">
                          {classroom.invite_code}
                        </code>
                        <button
                          onClick={() => copyInviteCode(classroom.invite_code)}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          {copiedCode === classroom.invite_code ? (
                            <span className="material-symbols-outlined text-lg text-[var(--success)]">check</span>
                          ) : (
                            <span className="material-symbols-outlined text-lg">content_copy</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/classrooms/${classroom.id}`}
                    className="h-9 px-4 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    View
                  </Link>
                  <button
                    onClick={() => deleteClassroom(classroom.id)}
                    className="p-2 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
