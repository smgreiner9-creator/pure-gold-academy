'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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

interface EmotionStats {
  emotion: string
  trades: number
  wins: number
  winRate: number
}

interface MonthlyStats {
  month: string
  trades: number
  wins: number
  winRate: number
  pnl: number
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string
  const { profile } = useAuth()
  const [student, setStudent] = useState<Profile | null>(null)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [feedback, setFeedback] = useState<(JournalFeedback & { journal?: JournalEntry })[]>([])
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [emotionStats, setEmotionStats] = useState<EmotionStats[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'journals' | 'feedback'>('overview')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id && studentId) {
      loadStudentData()
    }
  }, [profile?.id, studentId])

  const loadStudentData = async () => {
    try {
      // Load student profile and journals
      const [studentRes, journalsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single(),
        supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', studentId)
          .order('trade_date', { ascending: false })
      ])

      if (studentRes.data) {
        setStudent(studentRes.data)
      }

      const journalsData = journalsRes.data || []
      setJournals(journalsData)

      // Load feedback for this student's journals
      if (journalsData.length > 0 && profile?.id) {
        const journalIds = journalsData.map(j => j.id)
        const { data: feedbackData } = await supabase
          .from('journal_feedback')
          .select('*')
          .eq('teacher_id', profile.id)
          .in('journal_entry_id', journalIds)
          .order('created_at', { ascending: false })

        // Map feedback to include journal info
        const journalMap = new Map(journalsData.map(j => [j.id, j]))
        const feedbackWithJournals = (feedbackData || []).map(f => ({
          ...f,
          journal: journalMap.get(f.journal_entry_id)
        }))

        setFeedback(feedbackWithJournals as (JournalFeedback & { journal?: JournalEntry })[])
      }

      // Calculate stats
      calculateStats(journalsData)
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (journalsData: JournalEntry[]) => {
    const wins = journalsData.filter(j => j.outcome === 'win').length
    const losses = journalsData.filter(j => j.outcome === 'loss').length
    const breakevens = journalsData.filter(j => j.outcome === 'breakeven').length
    const totalWithOutcome = wins + losses + breakevens

    const rMultiples = journalsData.filter(j => j.r_multiple !== null).map(j => j.r_multiple!)
    const avgR = rMultiples.length > 0
      ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length
      : 0

    const pnls = journalsData.filter(j => j.pnl !== null).map(j => j.pnl!)
    const totalPnL = pnls.reduce((a, b) => a + b, 0)

    // Calculate profit factor
    const grossProfit = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    // Calculate streak
    let streak = 0
    if (journalsData.length > 0) {
      const sortedDates = [...new Set(journalsData.map(j => j.trade_date))].sort().reverse()
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

    setStats({
      totalTrades: journalsData.length,
      wins,
      losses,
      breakevens,
      winRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
      avgRMultiple: avgR,
      totalPnL,
      streak,
      profitFactor: profitFactor === Infinity ? 999 : profitFactor,
    })

    // Calculate emotion stats
    const emotionMap = new Map<string, { trades: number; wins: number }>()
    journalsData.forEach(j => {
      const emotion = j.emotion_before
      const existing = emotionMap.get(emotion) || { trades: 0, wins: 0 }
      existing.trades++
      if (j.outcome === 'win') existing.wins++
      emotionMap.set(emotion, existing)
    })

    const emotionStatsArray: EmotionStats[] = []
    emotionMap.forEach((value, emotion) => {
      emotionStatsArray.push({
        emotion,
        trades: value.trades,
        wins: value.wins,
        winRate: value.trades > 0 ? (value.wins / value.trades) * 100 : 0
      })
    })
    setEmotionStats(emotionStatsArray.sort((a, b) => b.trades - a.trades))

    // Calculate monthly stats
    const monthlyMap = new Map<string, { trades: number; wins: number; pnl: number }>()
    journalsData.forEach(j => {
      const month = j.trade_date.substring(0, 7) // YYYY-MM
      const existing = monthlyMap.get(month) || { trades: 0, wins: 0, pnl: 0 }
      existing.trades++
      if (j.outcome === 'win') existing.wins++
      if (j.pnl !== null) existing.pnl += j.pnl
      monthlyMap.set(month, existing)
    })

    const monthlyStatsArray: MonthlyStats[] = []
    monthlyMap.forEach((value, month) => {
      monthlyStatsArray.push({
        month,
        trades: value.trades,
        wins: value.wins,
        winRate: value.trades > 0 ? (value.wins / value.trades) * 100 : 0,
        pnl: value.pnl
      })
    })
    setMonthlyStats(monthlyStatsArray.sort((a, b) => a.month.localeCompare(b.month)))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'win': return 'text-[var(--success)] bg-[var(--success)]/10'
      case 'loss': return 'text-[var(--danger)] bg-[var(--danger)]/10'
      case 'breakeven': return 'text-[var(--warning)] bg-[var(--warning)]/10'
      default: return 'text-[var(--muted)] bg-white/5'
    }
  }

  const getEmotionIcon = (emotion: string) => {
    const icons: Record<string, string> = {
      calm: 'spa',
      confident: 'sentiment_very_satisfied',
      anxious: 'sentiment_stressed',
      fearful: 'sentiment_worried',
      greedy: 'attach_money',
      frustrated: 'sentiment_frustrated',
      neutral: 'sentiment_neutral'
    }
    return icons[emotion] || 'psychology'
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4">person_off</span>
          <h3 className="text-xl font-bold mb-2">Student Not Found</h3>
          <p className="text-[var(--muted)] mb-4">This student may have been removed or doesn&apos;t exist.</p>
          <Link href="/teacher/students" className="text-[var(--gold)] hover:underline">
            Back to Students
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/teacher/students"
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-white transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Students
      </Link>

      {/* Student Header */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl gold-gradient flex items-center justify-center text-black font-bold text-2xl shrink-0">
            {student.display_name?.[0] || student.email[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{student.display_name || student.email}</h1>
            <p className="text-[var(--muted)]">{student.email}</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Joined {formatDate(student.created_at)}
            </p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Total Trades</p>
            <p className="text-2xl font-bold">{stats.totalTrades}</p>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Win Rate</p>
            <p className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Avg R-Multiple</p>
            <p className={`text-2xl font-bold ${stats.avgRMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.avgRMultiple >= 0 ? '+' : ''}{stats.avgRMultiple.toFixed(2)}R
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Profit Factor</p>
            <p className={`text-2xl font-bold ${stats.profitFactor >= 1 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Win/Loss Breakdown */}
      {stats && (
        <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold mb-4">Trade Outcomes</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex h-3 rounded-full overflow-hidden bg-black/40">
                {stats.wins > 0 && (
                  <div
                    className="bg-[var(--success)]"
                    style={{ width: `${(stats.wins / stats.totalTrades) * 100}%` }}
                  />
                )}
                {stats.breakevens > 0 && (
                  <div
                    className="bg-[var(--warning)]"
                    style={{ width: `${(stats.breakevens / stats.totalTrades) * 100}%` }}
                  />
                )}
                {stats.losses > 0 && (
                  <div
                    className="bg-[var(--danger)]"
                    style={{ width: `${(stats.losses / stats.totalTrades) * 100}%` }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--success)]" />
              <span className="text-[var(--success)] font-bold">{stats.wins}</span> Wins
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--warning)]" />
              <span className="text-[var(--warning)] font-bold">{stats.breakevens}</span> Breakeven
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--danger)]" />
              <span className="text-[var(--danger)] font-bold">{stats.losses}</span> Losses
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--card-border)]">
        <div className="flex gap-6">
          {(['overview', 'journals', 'feedback'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-semibold capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--gold)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Monthly Progress */}
          {monthlyStats.length > 0 && (
            <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <h3 className="font-bold mb-4">Monthly Progress</h3>
              <div className="space-y-3">
                {monthlyStats.slice(-6).map(month => (
                  <div key={month.month} className="flex items-center gap-4">
                    <span className="text-sm text-[var(--muted)] w-20">
                      {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex-1">
                      <div className="flex h-2 rounded-full overflow-hidden bg-black/40">
                        <div
                          className={month.winRate >= 50 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}
                          style={{ width: `${month.winRate}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold w-16 text-right ${
                      month.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {month.winRate.toFixed(0)}%
                    </span>
                    <span className="text-xs text-[var(--muted)] w-16 text-right">
                      {month.trades} trades
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotion Analysis */}
          {emotionStats.length > 0 && (
            <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <h3 className="font-bold mb-4">Emotion Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {emotionStats.map(e => (
                  <div
                    key={e.emotion}
                    className="p-3 rounded-xl bg-black/20 border border-[var(--card-border)]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-lg text-[var(--gold)]">
                        {getEmotionIcon(e.emotion)}
                      </span>
                      <span className="text-sm font-semibold capitalize">{e.emotion}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className={`text-lg font-bold ${
                        e.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}>
                        {e.winRate.toFixed(0)}%
                      </span>
                      <span className="text-xs text-[var(--muted)]">{e.trades} trades</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'journals' && (
        <div className="space-y-3">
          {journals.length === 0 ? (
            <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4">edit_note</span>
              <p className="text-[var(--muted)]">No journal entries yet</p>
            </div>
          ) : (
            journals.map(journal => (
              <Link
                key={journal.id}
                href={`/journal/${journal.id}`}
                className="block p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${getOutcomeColor(journal.outcome)}`}>
                      {journal.outcome || 'Open'}
                    </span>
                    <span className="font-bold">{journal.instrument}</span>
                    <span className={`text-sm font-semibold ${
                      journal.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {journal.direction.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {journal.r_multiple !== null && (
                      <span className={`font-bold ${
                        journal.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}>
                        {journal.r_multiple >= 0 ? '+' : ''}{journal.r_multiple}R
                      </span>
                    )}
                    <span className="text-sm text-[var(--muted)]">
                      {formatDate(journal.trade_date)}
                    </span>
                    <span className="material-symbols-outlined text-[var(--muted)]">chevron_right</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {feedback.length === 0 ? (
            <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4">chat</span>
              <p className="text-[var(--muted)]">No feedback given yet</p>
            </div>
          ) : (
            feedback.map(f => (
              <div
                key={f.id}
                className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {f.journal && (
                      <Link
                        href={`/journal/${f.journal_entry_id}`}
                        className="text-sm font-semibold text-[var(--gold)] hover:underline"
                      >
                        {(f.journal as JournalEntry).instrument} - {(f.journal as JournalEntry).direction.toUpperCase()}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {formatDate(f.created_at)}
                  </span>
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
