'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface MiniStats {
  winRate: number
  totalR: number
  totalTrades: number
  currentStreak: number
  wins: number
  losses: number
}

export function MiniStatsBar() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<MiniStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadStats = useCallback(async () => {
    if (!profile?.id) return

    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('outcome, r_multiple')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })

      if (error) throw error

      if (!entries || entries.length === 0) {
        setStats(null)
        setIsLoading(false)
        return
      }

      const wins = entries.filter(e => e.outcome === 'win').length
      const losses = entries.filter(e => e.outcome === 'loss').length
      const breakeven = entries.filter(e => e.outcome === 'breakeven').length
      const closedTrades = wins + losses + breakeven
      const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0

      const rMultiples = entries.filter(e => e.r_multiple !== null).map(e => e.r_multiple as number)
      const totalR = rMultiples.reduce((sum, r) => sum + r, 0)

      // Current streak
      let currentStreak = 0
      for (const entry of entries) {
        if (entry.outcome === 'win') {
          currentStreak++
        } else if (entry.outcome === 'loss') {
          break
        }
      }

      setStats({
        winRate,
        totalR,
        totalTrades: entries.length,
        currentStreak,
        wins,
        losses,
      })
    } catch (error) {
      console.error('Error loading mini stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadStats()
    }
  }, [profile?.id, loadStats])

  if (isLoading) {
    return (
      <div className="flex gap-4 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse">
        <div className="h-8 w-20 bg-white/5 rounded" />
        <div className="h-8 w-20 bg-white/5 rounded" />
        <div className="h-8 w-20 bg-white/5 rounded" />
        <div className="h-8 w-20 bg-white/5 rounded" />
      </div>
    )
  }

  if (!stats || stats.totalTrades === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-6 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-x-auto">
      {/* Win Rate */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg font-bold mono-num ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {stats.winRate.toFixed(0)}%
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">Win</span>
      </div>

      <div className="w-px h-6 bg-[var(--card-border)]" />

      {/* Total R */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg font-bold mono-num ${stats.totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(1)}R
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">Total</span>
      </div>

      <div className="w-px h-6 bg-[var(--card-border)]" />

      {/* W/L */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold mono-num">
          <span className="text-[var(--success)]">{stats.wins}</span>
          <span className="text-[var(--muted)]">/</span>
          <span className="text-[var(--danger)]">{stats.losses}</span>
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">W/L</span>
      </div>

      <div className="w-px h-6 bg-[var(--card-border)]" />

      {/* Streak */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold mono-num text-[var(--gold)]">
          {stats.currentStreak}
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">Streak</span>
      </div>
    </div>
  )
}
