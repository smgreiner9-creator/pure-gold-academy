'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ClassAnalytics } from '@/components/teacher/ClassAnalytics'
import { StudentAlerts } from '@/components/teacher/StudentAlerts'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Profile, Classroom, JournalEntry } from '@/types/database'

type SortKey = 'name' | 'win_rate' | 'last_active' | 'trades' | 'avg_r'
type SortDir = 'asc' | 'desc'

interface StudentWithStats extends Profile {
  total_trades: number
  win_rate: number
  avg_r: number
  last_journal_date: string | null
  streak: number
}

export default function StudentsPage() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showSection, setShowSection] = useState<'overview' | 'analytics'>('overview')
  const supabase = useMemo(() => createClient(), [])

  // Raw student profiles for alerts
  const [studentProfiles, setStudentProfiles] = useState<Profile[]>([])

  const loadData = useCallback(async () => {
    if (!profile?.id) return
    setIsLoading(true)

    try {
      // Load classrooms
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      const loadedClassrooms = classroomData || []
      setClassrooms(loadedClassrooms)

      if (loadedClassrooms.length === 0) {
        setIsLoading(false)
        return
      }

      const classroomIds = selectedClassroom === 'all'
        ? loadedClassrooms.map((c) => c.id)
        : [selectedClassroom]

      // Load students and all journals in parallel
      const [studentsRes, journalsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .in('classroom_id', classroomIds)
          .eq('role', 'student')
          .order('display_name', { ascending: true }),
        supabase
          .from('journal_entries')
          .select('*')
          .in('classroom_id', classroomIds)
          .order('trade_date', { ascending: false }),
      ])

      const studentData = studentsRes.data || []
      const journalData = journalsRes.data || []

      setStudentProfiles(studentData)
      setAllEntries(journalData)

      // Group journals by student
      const journalsByStudent = new Map<string, JournalEntry[]>()
      journalData.forEach((journal) => {
        const existing = journalsByStudent.get(journal.user_id) || []
        existing.push(journal)
        journalsByStudent.set(journal.user_id, existing)
      })

      // Calculate stats for each student
      const studentsWithStats = studentData.map((student) => {
        const journals = journalsByStudent.get(student.id) || []
        const totalTrades = journals.length
        const closedTrades = journals.filter((j) => j.outcome !== null)
        const wins = closedTrades.filter((j) => j.outcome === 'win').length
        const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0
        const lastJournal = journals[0]?.trade_date || null

        // Average R-multiple
        const withR = journals.filter((j) => j.r_multiple !== null)
        const avgR = withR.length > 0
          ? withR.reduce((sum, j) => sum + (j.r_multiple || 0), 0) / withR.length
          : 0

        // Calculate streak
        let streak = 0
        if (journals.length > 0) {
          const sortedDates = [...new Set(journals.map((j) => j.trade_date))].sort().reverse()
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
          avg_r: avgR,
          last_journal_date: lastJournal,
          streak,
        } as StudentWithStats
      })

      setStudents(studentsWithStats)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, selectedClassroom, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  // Overview stats
  const overviewStats = useMemo(() => {
    const total = students.length
    const closedEntries = allEntries.filter((e) => e.outcome !== null)
    const wins = closedEntries.filter((e) => e.outcome === 'win').length
    const avgWinRate = closedEntries.length > 0 ? (wins / closedEntries.length) * 100 : 0

    const withR = allEntries.filter((e) => e.r_multiple !== null)
    const avgR = withR.length > 0
      ? withR.reduce((sum, e) => sum + (e.r_multiple || 0), 0) / withR.length
      : 0

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const activeStudentIds = new Set(
      allEntries
        .filter((e) => new Date(e.trade_date) >= sevenDaysAgo)
        .map((e) => e.user_id)
    )
    const activeJournalers = activeStudentIds.size

    return { total, avgWinRate, avgR, activeJournalers }
  }, [students, allEntries])

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    let result = students

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          (s.display_name || '').toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'name':
          comparison = (a.display_name || a.email).localeCompare(b.display_name || b.email)
          break
        case 'win_rate':
          comparison = a.win_rate - b.win_rate
          break
        case 'last_active':
          comparison =
            (a.last_journal_date ? new Date(a.last_journal_date).getTime() : 0) -
            (b.last_journal_date ? new Date(b.last_journal_date).getTime() : 0)
          break
        case 'trades':
          comparison = a.total_trades - b.total_trades
          break
        case 'avg_r':
          comparison = a.avg_r - b.avg_r
          break
      }
      return sortDir === 'asc' ? comparison : -comparison
    })

    return result
  }, [students, search, sortKey, sortDir])

  // Students with entries for alerts
  const studentsForAlerts = useMemo(() => {
    const journalsByStudent = new Map<string, JournalEntry[]>()
    allEntries.forEach((entry) => {
      const existing = journalsByStudent.get(entry.user_id) || []
      existing.push(entry)
      journalsByStudent.set(entry.user_id, existing)
    })

    return studentProfiles.map((p) => ({
      profile: p,
      entries: journalsByStudent.get(p.id) || [],
    }))
  }, [studentProfiles, allEntries])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null
    return (
      <span className="material-symbols-outlined text-xs text-[var(--gold)]">
        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="content-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-2xl glass-surface animate-pulse h-24" />
        ))}
        {[1, 2, 3].map((i) => (
          <div key={i} className="col-span-full p-6 rounded-2xl glass-surface animate-pulse h-24" />
        ))}
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Track your students' progress"
        action={
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="input-field rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          >
            <option value="all">All Classrooms</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        }
      />

      <div className="content-grid">

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[var(--gold)] text-lg">group</span>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Total Students</p>
          </div>
          <p className="text-3xl font-bold">{overviewStats.total}</p>
        </div>
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[var(--gold)] text-lg">percent</span>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Avg Win Rate</p>
          </div>
          <p className={`text-3xl font-bold mono-num ${overviewStats.avgWinRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {overviewStats.avgWinRate.toFixed(1)}%
          </p>
        </div>
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[var(--gold)] text-lg">show_chart</span>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Avg R-Multiple</p>
          </div>
          <p className={`text-3xl font-bold mono-num ${overviewStats.avgR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {overviewStats.avgR >= 0 ? '+' : ''}{overviewStats.avgR.toFixed(2)}R
          </p>
        </div>
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[var(--gold)] text-lg">edit_note</span>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Active (7d)</p>
          </div>
          <p className="text-3xl font-bold">
            {overviewStats.activeJournalers}
            <span className="text-sm text-[var(--muted)] font-normal ml-1">/ {overviewStats.total}</span>
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="col-span-full flex gap-2">
        <button
          onClick={() => setShowSection('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            showSection === 'overview'
              ? 'glass-elevated text-[var(--gold)]'
              : 'border border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">groups</span>
            Students
          </span>
        </button>
        <button
          onClick={() => setShowSection('analytics')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            showSection === 'analytics'
              ? 'glass-elevated text-[var(--gold)]'
              : 'border border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">analytics</span>
            Class Analytics
          </span>
        </button>
      </div>

      {showSection === 'analytics' && (
        <div className="col-span-full"><ClassAnalytics entries={allEntries} /></div>
      )}

      {showSection === 'overview' && (
        <div className="col-span-full space-y-6">
          {/* Alerts */}
          <StudentAlerts students={studentsForAlerts} />

          {/* Student List */}
          {students.length === 0 ? (
            <div className="p-6 rounded-2xl glass-surface text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[var(--gold)]">group</span>
              </div>
              <h3 className="text-xl font-bold mb-2">No Students Yet</h3>
              <p className="text-[var(--muted)] text-sm">
                Share your classroom invite code to get students enrolled
              </p>
            </div>
          ) : (
            <div className="rounded-2xl glass-surface overflow-hidden">
              {/* Search and Sort Header */}
              <div className="p-4 border-b border-[var(--glass-surface-border)] flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-lg">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full input-field rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[var(--gold)] transition-colors"
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    ['name', 'Name'],
                    ['win_rate', 'Win Rate'],
                    ['avg_r', 'Avg R'],
                    ['trades', 'Trades'],
                    ['last_active', 'Last Active'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleSort(key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        sortKey === key
                          ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20'
                          : 'bg-black/5 text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent'
                      }`}
                    >
                      {label}
                      {sortIndicator(key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student Rows */}
              <div className="divide-y divide-[var(--glass-surface-border)]">
                {filteredStudents.map((student) => (
                  <Link
                    key={student.id}
                    href={`/teacher/students/${student.id}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 hover:bg-black/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-black font-bold text-sm shrink-0">
                        {student.display_name?.[0] || student.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate group-hover:text-[var(--gold)] transition-colors">
                          {student.display_name || student.email}
                        </p>
                        <p className="text-xs text-[var(--muted)] truncate">{student.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 md:gap-6">
                      <div className="text-center min-w-[50px]">
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wider">Trades</p>
                        <p className="font-bold">{student.total_trades}</p>
                      </div>
                      <div className="text-center min-w-[55px]">
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wider">Win Rate</p>
                        <p
                          className={`font-bold mono-num ${
                            student.win_rate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {student.win_rate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center min-w-[55px]">
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wider">Avg R</p>
                        <p
                          className={`font-bold mono-num ${
                            student.avg_r >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {student.avg_r >= 0 ? '+' : ''}
                          {student.avg_r.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <p className="text-[9px] text-[var(--muted)] uppercase tracking-wider">Last Entry</p>
                        <p className="font-bold text-sm">
                          {student.last_journal_date
                            ? new Date(student.last_journal_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Never'}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-[var(--gold)] transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredStudents.length === 0 && search.trim() && (
                <div className="p-8 text-center">
                  <p className="text-[var(--muted)] text-sm">No students match &quot;{search}&quot;</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
