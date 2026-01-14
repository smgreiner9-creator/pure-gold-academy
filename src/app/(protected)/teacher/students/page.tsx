'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Classroom } from '@/types/database'

interface StudentWithStats extends Profile {
  total_trades: number
  win_rate: number
  last_journal_date: string | null
  streak: number
}

export default function StudentsPage() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id])

  useEffect(() => {
    if (classrooms.length > 0) {
      loadStudents()
    }
  }, [selectedClassroom, classrooms])

  const loadData = async () => {
    if (!profile?.id) return

    try {
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      setClassrooms(classroomData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadStudents = async () => {
    if (!profile?.id) return

    setIsLoading(true)
    try {
      const classroomIds = selectedClassroom === 'all'
        ? classrooms.map(c => c.id)
        : [selectedClassroom]

      const { data: studentData } = await supabase
        .from('profiles')
        .select('*')
        .in('classroom_id', classroomIds)
        .eq('role', 'student')

      if (studentData) {
        // Get stats for each student
        const studentsWithStats = await Promise.all(
          studentData.map(async (student) => {
            const { data: journals } = await supabase
              .from('journal_entries')
              .select('outcome, trade_date')
              .eq('user_id', student.id)
              .order('trade_date', { ascending: false })

            const totalTrades = journals?.length || 0
            const wins = journals?.filter(j => j.outcome === 'win').length || 0
            const withOutcome = journals?.filter(j => j.outcome).length || 0
            const winRate = withOutcome > 0 ? (wins / withOutcome) * 100 : 0
            const lastJournal = journals?.[0]?.trade_date || null

            // Calculate streak
            let streak = 0
            if (journals && journals.length > 0) {
              const sortedDates = [...new Set(journals.map(j => j.trade_date))].sort().reverse()
              for (let i = 0; i < sortedDates.length; i++) {
                const expectedDate = new Date()
                expectedDate.setDate(expectedDate.getDate() - i)
                const expected = expectedDate.toISOString().split('T')[0]
                if (sortedDates[i] === expected) {
                  streak++
                } else {
                  break
                }
              }
            }

            return {
              ...student,
              total_trades: totalTrades,
              win_rate: winRate,
              last_journal_date: lastJournal,
              streak,
            } as StudentWithStats
          })
        )

        setStudents(studentsWithStats)
      }
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && students.length === 0) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Analytics</h1>
          <p className="text-[var(--muted)] text-sm">Track your students progress</p>
        </div>
        <select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
        >
          <option value="all">All Classrooms</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {students.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">group</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Students Yet</h3>
          <p className="text-[var(--muted)] text-sm">
            Share your classroom invite code to get students enrolled
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map(student => (
            <div
              key={student.id}
              className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-black font-bold">
                    {student.display_name?.[0] || student.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold">{student.display_name || student.email}</h3>
                    <p className="text-sm text-[var(--muted)]">{student.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Trades</p>
                    <p className="font-bold text-lg">{student.total_trades}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Win Rate</p>
                    <p className={`font-bold text-lg ${
                      student.win_rate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {student.win_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Streak</p>
                    <p className="font-bold text-lg text-[var(--gold)]">{student.streak} days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Last Entry</p>
                    <p className="font-bold">
                      {student.last_journal_date
                        ? new Date(student.last_journal_date).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
