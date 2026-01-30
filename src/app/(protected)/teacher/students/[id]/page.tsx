'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { EquityCurve } from '@/components/analytics/EquityCurve'
import { EmotionCorrelation } from '@/components/analytics/EmotionCorrelation'
import { RuleAdherence } from '@/components/analytics/RuleAdherence'
import { PsychologyAnalysis } from '@/components/analytics/PsychologyAnalysis'
import type { Profile, JournalEntry, JournalFeedback } from '@/types/database'

interface StudentStats {
  totalTrades: number
  wins: number
  losses: number
  breakevens: number
  winRate: number
  avgRMultiple: number
  totalPnL: number
  streak: number
  profitFactor: number
}

type TabKey = 'overview' | 'emotions' | 'rules' | 'psychology' | 'journals' | 'feedback'

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  const { profile } = useAuth()
  const [student, setStudent] = useState<Profile | null>(null)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [feedback, setFeedback] = useState<(JournalFeedback & { journal?: JournalEntry })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const supabase = useMemo(() => createClient(), [])

  const loadStudentData = useCallback(async () => {
    try {
      // Load student profile
      const studentRes = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single()

      if (!studentRes.data) {
        setIsLoading(false)
        return
      }

      // Authorization: verify teacher has a classroom the student is subscribed to
      const [teacherClassroomsRes, studentSubscriptionsRes] = await Promise.all([
        supabase
          .from('classrooms')
          .select('id')
          .eq('teacher_id', profile!.id),
        supabase
          .from('classroom_subscriptions')
          .select('classroom_id')
          .eq('student_id', studentId)
          .eq('status', 'active'),
      ])

      const teacherClassroomIds = new Set(
        (teacherClassroomsRes.data || []).map((c) => c.id)
      )
      const studentClassroomIds = (studentSubscriptionsRes.data || []).map(
        (s) => s.classroom_id
      )

      // Find overlapping classroom IDs
      const authorizedClassroomIds = studentClassroomIds.filter((id) =>
        teacherClassroomIds.has(id)
      )

      if (authorizedClassroomIds.length === 0) {
        router.push('/teacher/students')
        return
      }

      setStudent(studentRes.data)

      // Only fetch journal entries from the teacher's authorized classrooms
      const journalsRes = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', studentId)
        .in('classroom_id', authorizedClassroomIds)
        .order('trade_date', { ascending: false })

      const journalsData = journalsRes.data || []
      setJournals(journalsData)

      // Load feedback for this student's journals
      if (journalsData.length > 0 && profile?.id) {
        const journalIds = journalsData.map((j) => j.id)
        const { data: feedbackData } = await supabase
          .from('journal_feedback')
          .select('*')
          .eq('teacher_id', profile.id)
          .in('journal_entry_id', journalIds)
          .order('created_at', { ascending: false })

        // Map feedback to include journal info
        const journalMap = new Map(journalsData.map((j) => [j.id, j]))
        const feedbackWithJournals = (feedbackData || []).map((f) => ({
          ...f,
          journal: journalMap.get(f.journal_entry_id),
        }))

        setFeedback(feedbackWithJournals as (JournalFeedback & { journal?: JournalEntry })[])
      }
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, studentId, supabase, router])

  useEffect(() => {
    if (profile?.id && studentId) {
      loadStudentData()
    }
  }, [profile?.id, studentId, loadStudentData])

  // Calculate stats
  const stats = useMemo<StudentStats | null>(() => {
    if (journals.length === 0) return null

    const wins = journals.filter((j) => j.outcome === 'win').length
    const losses = journals.filter((j) => j.outcome === 'loss').length
    const breakevens = journals.filter((j) => j.outcome === 'breakeven').length
    const totalWithOutcome = wins + losses + breakevens

    const rMultiples = journals.filter((j) => j.r_multiple !== null).map((j) => j.r_multiple!)
    const avgR = rMultiples.length > 0
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
      : 0

    const pnls = journals.filter((j) => j.pnl !== null).map((j) => j.pnl!)
    const totalPnL = pnls.reduce((a, b) => a + b, 0)

    const grossProfit = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

    // Streak
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
      totalTrades: journals.length,
      wins,
      losses,
      breakevens,
      winRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
      avgRMultiple: avgR,
      totalPnL,
      streak,
      profitFactor,
    }
  }, [journals])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'win':
        return 'text-[var(--success)] bg-[var(--success)]/10'
      case 'loss':
        return 'text-[var(--danger)] bg-[var(--danger)]/10'
      case 'breakeven':
        return 'text-[var(--warning)] bg-[var(--warning)]/10'
      default:
        return 'text-[var(--muted)] bg-black/5'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="p-6 rounded-2xl glass-surface animate-pulse h-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl glass-surface animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="p-6 rounded-2xl glass-surface text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4 block">person_off</span>
          <h3 className="text-xl font-bold mb-2">Student Not Found</h3>
          <p className="text-[var(--muted)] mb-4">This student may have been removed or doesn&apos;t exist.</p>
          <Link href="/teacher/students" className="text-[var(--gold)] hover:underline">
            Back to Students
          </Link>
        </div>
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'emotions', label: 'Emotions', icon: 'psychology' },
    { key: 'rules', label: 'Rules', icon: 'checklist' },
    { key: 'psychology', label: 'Psychology', icon: 'neurology' },
    { key: 'journals', label: 'Journals', icon: 'edit_note' },
    { key: 'feedback', label: 'Feedback', icon: 'chat' },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <Link
        href="/teacher/students"
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Dashboard
      </Link>

      {/* Student Header */}
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl gold-gradient flex items-center justify-center text-black font-bold text-2xl shrink-0">
            {student.display_name?.[0] || student.email[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{student.display_name || student.email}</h1>
            <p className="text-[var(--muted)]">{student.email}</p>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs text-[var(--muted)]">
                Joined {formatDate(student.created_at)}
              </span>
              {stats && (
                <span className="text-xs text-[var(--muted)]">
                  {stats.totalTrades} total trades
                </span>
              )}
            </div>
          </div>
          {stats && stats.streak > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20">
              <span className="material-symbols-outlined text-[var(--gold)]">local_fire_department</span>
              <span className="font-bold text-[var(--gold)]">{stats.streak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Win Rate</p>
            <p className={`text-2xl font-bold mono-num ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.winRate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-[var(--muted)]">{stats.wins}W / {stats.losses}L / {stats.breakevens}BE</p>
          </div>
          <div className="p-4 rounded-2xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Avg R-Multiple</p>
            <p className={`text-2xl font-bold mono-num ${stats.avgRMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.avgRMultiple >= 0 ? '+' : ''}{stats.avgRMultiple.toFixed(2)}R
            </p>
          </div>
          <div className="p-4 rounded-2xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Total P&L</p>
            <p className={`text-2xl font-bold mono-num ${stats.totalPnL >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-2xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Profit Factor</p>
            <p className={`text-2xl font-bold mono-num ${stats.profitFactor >= 1 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.profitFactor >= 999 ? '---' : stats.profitFactor.toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-2xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Total Trades</p>
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--glass-surface-border)] overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 pb-3 pt-1 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--gold)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Equity Curve */}
          <EquityCurve entries={journals} />

          {/* Recent Trades */}
          <div className="p-6 rounded-2xl glass-surface">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Recent Trades</h3>
              {journals.length > 10 && (
                <button
                  onClick={() => setActiveTab('journals')}
                  className="text-sm text-[var(--gold)] hover:underline"
                >
                  View all
                </button>
              )}
            </div>

            {journals.length === 0 ? (
              <p className="text-[var(--muted)] text-center py-6 text-sm">No trades logged yet.</p>
            ) : (
              <div className="space-y-2">
                {journals.slice(0, 10).map((journal) => (
                  <Link
                    key={journal.id}
                    href={`/journal/${journal.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-black/[0.03] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${getOutcomeColor(journal.outcome)}`}
                      >
                        {journal.outcome || 'Open'}
                      </span>
                      <span className="font-semibold text-sm">{journal.instrument}</span>
                      <span
                        className={`text-xs font-bold ${
                          journal.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                        }`}
                      >
                        {journal.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {journal.r_multiple !== null && (
                        <span
                          className={`font-bold mono-num text-sm ${
                            journal.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {journal.r_multiple >= 0 ? '+' : ''}
                          {journal.r_multiple.toFixed(2)}R
                        </span>
                      )}
                      {journal.pnl !== null && (
                        <span
                          className={`text-xs mono-num ${
                            journal.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {journal.pnl >= 0 ? '+' : ''}${journal.pnl.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(journal.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="material-symbols-outlined text-[var(--muted)] text-lg group-hover:text-[var(--gold)] transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'emotions' && (
        <EmotionCorrelation entries={journals} expanded={true} />
      )}

      {activeTab === 'rules' && (
        <RuleAdherence entries={journals} />
      )}

      {activeTab === 'psychology' && (
        <PsychologyAnalysis entries={journals} />
      )}

      {activeTab === 'journals' && (
        <div className="space-y-2">
          {journals.length === 0 ? (
            <div className="p-6 rounded-2xl glass-surface text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4 block">edit_note</span>
              <p className="text-[var(--muted)]">No journal entries yet</p>
            </div>
          ) : (
            journals.map((journal) => (
              <Link
                key={journal.id}
                href={`/journal/${journal.id}`}
                className="flex items-center justify-between p-4 rounded-2xl glass-surface glass-interactive transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${getOutcomeColor(journal.outcome)}`}
                  >
                    {journal.outcome || 'Open'}
                  </span>
                  <span className="font-bold">{journal.instrument}</span>
                  <span
                    className={`text-sm font-semibold ${
                      journal.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {journal.direction.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {journal.r_multiple !== null && (
                    <span
                      className={`font-bold mono-num ${
                        journal.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}
                    >
                      {journal.r_multiple >= 0 ? '+' : ''}
                      {journal.r_multiple.toFixed(2)}R
                    </span>
                  )}
                  <span className="text-sm text-[var(--muted)]">{formatDate(journal.trade_date)}</span>
                  <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-[var(--gold)] transition-colors">
                    chevron_right
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {feedback.length === 0 ? (
            <div className="p-6 rounded-2xl glass-surface text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4 block">chat</span>
              <p className="text-[var(--muted)]">No feedback given yet</p>
            </div>
          ) : (
            feedback.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl glass-surface"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {f.journal && (
                      <Link
                        href={`/journal/${f.journal_entry_id}`}
                        className="text-sm font-semibold text-[var(--gold)] hover:underline"
                      >
                        {(f.journal as JournalEntry).instrument} -{' '}
                        {(f.journal as JournalEntry).direction.toUpperCase()}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)]">{formatDate(f.created_at)}</span>
                </div>
                <p className="text-sm text-[var(--muted)]">{f.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
