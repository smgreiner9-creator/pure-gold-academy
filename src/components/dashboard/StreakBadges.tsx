'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { calculateStreak } from '@/lib/streakUtils'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress?: number
  target?: number
}

export function StreakBadges() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [streak, setStreak] = useState(0)
  const [totalTrades, setTotalTrades] = useState(0)
  const [winRate, setWinRate] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Fetch journal entries and check-ins in parallel
      const [entriesRes, checkinsRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('trade_date, outcome')
          .eq('user_id', profile.id)
          .order('trade_date', { ascending: false }),
        supabase
          .from('daily_checkins')
          .select('check_date')
          .eq('user_id', profile.id)
      ])

      const entries = entriesRes.data || []
      const checkins = checkinsRes.data || []

      if (entries.length > 0) {
        setTotalTrades(entries.length)

        // Calculate win rate
        const wins = entries.filter(e => e.outcome === 'win').length
        const withOutcome = entries.filter(e => e.outcome).length
        if (withOutcome > 0) {
          setWinRate(Math.round((wins / withOutcome) * 100))
        }

        // Use shared streak utility with rest day support
        const tradeDates = [...new Set(entries.map(e => e.trade_date))]
        const checkinDates = checkins.map(c => c.check_date)
        const streakData = calculateStreak(tradeDates, checkinDates, 1)

        setStreak(streakData.currentStreak)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadStats()
    }
  }, [profile?.id, loadStats])

  const achievements: Achievement[] = [
    {
      id: 'first-trade',
      title: 'First Steps',
      description: 'Log your first trade',
      icon: 'flag',
      unlocked: totalTrades >= 1,
    },
    {
      id: 'trader-10',
      title: 'Getting Started',
      description: 'Log 10 trades',
      icon: 'trending_up',
      unlocked: totalTrades >= 10,
      progress: Math.min(totalTrades, 10),
      target: 10,
    },
    {
      id: 'trader-50',
      title: 'Committed Trader',
      description: 'Log 50 trades',
      icon: 'military_tech',
      unlocked: totalTrades >= 50,
      progress: Math.min(totalTrades, 50),
      target: 50,
    },
    {
      id: 'streak-3',
      title: 'Consistency',
      description: '3-day journaling streak',
      icon: 'local_fire_department',
      unlocked: streak >= 3,
      progress: Math.min(streak, 3),
      target: 3,
    },
    {
      id: 'streak-7',
      title: 'Week Warrior',
      description: '7-day journaling streak',
      icon: 'whatshot',
      unlocked: streak >= 7,
      progress: Math.min(streak, 7),
      target: 7,
    },
    {
      id: 'streak-30',
      title: 'Discipline Master',
      description: '30-day journaling streak',
      icon: 'workspace_premium',
      unlocked: streak >= 30,
      progress: Math.min(streak, 30),
      target: 30,
    },
    {
      id: 'winrate-50',
      title: 'Profitable',
      description: 'Achieve 50%+ win rate',
      icon: 'emoji_events',
      unlocked: winRate >= 50 && totalTrades >= 10,
    },
    {
      id: 'winrate-60',
      title: 'Sharp Trader',
      description: 'Achieve 60%+ win rate',
      icon: 'stars',
      unlocked: winRate >= 60 && totalTrades >= 20,
    },
  ]

  const unlockedCount = achievements.filter(a => a.unlocked).length

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse">
        <div className="h-4 bg-white/5 rounded w-32 mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
          Achievements
        </h3>
        <span className="text-xs text-[var(--muted)]">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      {/* Current Streak Banner */}
      {streak > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--gold)]">local_fire_department</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--gold)]">{streak} Day Streak!</p>
              <p className="text-[10px] text-[var(--muted)]">Keep journaling daily to maintain it</p>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Grid */}
      <div className="grid grid-cols-4 gap-2">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative p-3 rounded-xl text-center transition-all ${
              achievement.unlocked
                ? 'bg-[var(--gold)]/10 border border-[var(--gold)]/30'
                : 'bg-black/20 border border-[var(--card-border)] opacity-50'
            }`}
            title={`${achievement.title}: ${achievement.description}`}
          >
            <span className={`material-symbols-outlined text-2xl ${
              achievement.unlocked ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
            }`}>
              {achievement.icon}
            </span>
            <p className={`text-[9px] font-bold mt-1 truncate ${
              achievement.unlocked ? 'text-[var(--gold)]' : 'text-[var(--muted)]'
            }`}>
              {achievement.title}
            </p>
            {achievement.target && !achievement.unlocked && (
              <div className="mt-1">
                <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--gold)] rounded-full"
                    style={{ width: `${((achievement.progress || 0) / achievement.target) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
