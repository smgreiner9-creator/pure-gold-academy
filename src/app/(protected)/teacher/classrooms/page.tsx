'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom } from '@/types/database'

export default function ClassroomsPage() {
  const { profile } = useAuth()
  const [classrooms, setClassrooms] = useState<(Classroom & { student_count?: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' })
  const [isCreating, setIsCreating] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadClassrooms()
    }
  }, [profile?.id])

  const loadClassrooms = async () => {
    if (!profile?.id) return

    try {
      // Load classrooms and student counts in parallel (2 queries instead of N+1)
      const [classroomsRes, studentsRes] = await Promise.all([
        supabase
          .from('classrooms')
          .select('*')
          .eq('teacher_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('classroom_id')
          .eq('role', 'student')
          .not('classroom_id', 'is', null)
      ])

      const classroomsData = classroomsRes.data || []
      const studentsData = studentsRes.data || []

      // Count students per classroom
      const studentCounts = new Map<string, number>()
      studentsData.forEach(s => {
        if (s.classroom_id) {
          studentCounts.set(s.classroom_id, (studentCounts.get(s.classroom_id) || 0) + 1)
        }
      })

      // Add student counts to classrooms
      const classroomsWithCounts = classroomsData.map(classroom => ({
        ...classroom,
        student_count: studentCounts.get(classroom.id) || 0
      }))

      setClassrooms(classroomsWithCounts)
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createClassroom = async () => {
    if (!profile?.id || !newClassroom.name.trim()) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: profile.id,
          name: newClassroom.name.trim(),
          description: newClassroom.description.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      setClassrooms([{ ...data, student_count: 0 }, ...classrooms])
      setNewClassroom({ name: '', description: '' })
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating classroom:', error)
    } finally {
      setIsCreating(false)
    }
  }

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
          <h1 className="text-2xl font-bold">Classrooms</h1>
          <p className="text-[var(--muted)] text-sm">Create and manage your classrooms</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm w-fit"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Classroom
        </button>
      </div>

      {classrooms.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Classrooms Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Create a classroom to start accepting students
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Classroom
          </button>
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
                    <h3 className="font-bold text-lg">{classroom.name}</h3>
                    {classroom.description && (
                      <p className="text-sm text-[var(--muted)] mt-1">{classroom.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold mb-6">Create New Classroom</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Classroom Name *
                </label>
                <input
                  type="text"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Gold Trading Masterclass"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Description (optional)
                </label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what students will learn..."
                  rows={3}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createClassroom}
                  disabled={isCreating || !newClassroom.name.trim()}
                  className="flex-1 gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isCreating ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : null}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
