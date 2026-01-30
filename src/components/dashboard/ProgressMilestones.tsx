'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { calculateStreak } from '@/lib/streakUtils'

interface Milestone {
  id: string
  name: string
  description: string
  icon: string
  target: number
  type: 'trades' | 'streak' | 'winrate'
  minTrades?: number
}

const milestones: Milestone[] = [
  { id: 'first', name: 'First Steps', description: 'Log your first trade', icon: 'flag', target: 1, type: 'trades' },
  { id: 'ten', name: 'Getting Started', description: 'Log 10 trades', icon: 'trending_up', target: 10, type: 'trades' },
  { id: 'fifty', name: 'Committed Trader', description: 'Log 50 trades', icon: 'military_tech', target: 50, type: 'trades' },
  { id: 'streak3', name: 'Consistency', description: '3-day journaling streak', icon: 'local_fire_department', target: 3, type: 'streak' },
  { id: 'streak7', name: 'Week Warrior', description: '7-day journaling streak', icon: 'whatshot', target: 7, type: 'streak' },
  { id: 'streak30', name: 'Discipline Master', description: '30-day journaling streak', icon: 'workspace_premium', target: 30, type: 'streak' },
  { id: 'winrate50', name: 'Profitable', description: '50%+ win rate', icon: 'emoji_events', target: 50, type: 'winrate', minTrades: 10 },
  { id: 'winrate60', name: 'Sharp Trader', description: '60%+ win rate', icon: 'stars', target: 60, type: 'winrate', minTrades: 20 },
]

export function ProgressMilestones() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    streak: 0,
  })

  const loadStats = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Load journal entries
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('trade_date, outcome')
        .eq('user_id', profile.id)

      // Load check-ins
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('check_date')
        .eq('user_id', profile.id)

      if (entries) {
        const tradeDates = [...new Set(entries.map(e => e.trade_date))]
        const checkinDates = checkins?.map(c => c.check_date) || []

        const wins = entries.filter(e => e.outcome === 'win').length
        const totalWithOutcome = entries.filter(e => e.outcome).length
        const winRate = totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0

        const streakData = calculateStreak(tradeDates, checkinDates, 1)

        setStats({
          totalTrades: entries.length,
          winRate,
          streak: streakData.currentStreak,
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    loadStats()
  }, [profile?.id, loadStats])

  // Find next milestone
  const nextMilestone = useMemo(() => {
    for (const milestone of milestones) {
      let progress = 0
      let isUnlocked = false

      switch (milestone.type) {
        case 'trades':
          progress = stats.totalTrades
          isUnlocked = progress >= milestone.target
          break
        case 'streak':
          progress = stats.streak
          isUnlocked = progress >= milestone.target
          break
        case 'winrate':
          progress = stats.winRate
          isUnlocked = progress >= milestone.target && stats.totalTrades >= (milestone.minTrades || 0)
          break
      }

      if (!isUnlocked) {
        return { ...milestone, progress, isUnlocked }
      }
    }
    return null // All milestones unlocked
  }, [stats])

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass-surface animate-pulse h-24" />
    )
  }

  return (
    <div className="p-6 rounded-2xl glass-surface">
      {/* Quick Stats Row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-[var(--muted)]">Your Progress</h3>
        <Link
          href="/settings#achievements"
          className="text-xs text-[var(--gold)] hover:underline flex items-center gap-1"
        >
          View all
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </Link>
      </div>

      {/* Stats Pills */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5">
          <span className="material-symbols-outlined text-[var(--gold)] text-lg">local_fire_department</span>
          <span className="font-bold">{stats.streak}</span>
          <span className="text-xs text-[var(--muted)]">day streak</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5">
          <span className="material-symbols-outlined text-[var(--gold)] text-lg">trending_up</span>
          <span className="font-bold">{stats.totalTrades}</span>
          <span className="text-xs text-[var(--muted)]">trades</span>
        </div>
        {stats.totalTrades >= 5 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5">
            <span className={`material-symbols-outlined text-lg ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
              {stats.winRate >= 50 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className="font-bold">{stats.winRate.toFixed(0)}%</span>
            <span className="text-xs text-[var(--muted)]">win rate</span>
          </div>
        )}
      </div>

      {/* Next Milestone */}
      {nextMilestone ? (
        <div className="pt-3 border-t border-[var(--glass-surface-border)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--muted)]">{nextMilestone.icon}</span>
              <span className="text-sm font-medium">Next: {nextMilestone.name}</span>
            </div>
            <span className="text-xs text-[var(--muted)]">
              {nextMilestone.type === 'winrate'
                ? `${nextMilestone.progress.toFixed(0)}% / ${nextMilestone.target}%`
                : `${Math.min(nextMilestone.progress, nextMilestone.target)} / ${nextMilestone.target}`}
            </span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--gold)] rounded-full transition-all"
              style={{
                width: `${Math.min((nextMilestone.progress / nextMilestone.target) * 100, 100)}%`
              }}
            />
          </div>
          <p className="text-xs text-[var(--muted)] mt-1.5">{nextMilestone.description}</p>
        </div>
      ) : (
        <div className="pt-3 border-t border-[var(--glass-surface-border)] text-center">
          <span className="material-symbols-outlined text-[var(--gold)] text-2xl">emoji_events</span>
          <p className="text-sm font-medium mt-1">All milestones unlocked!</p>
          <p className="text-xs text-[var(--muted)]">You&apos;re a trading journal master</p>
        </div>
      )}
    </div>
  )
}
