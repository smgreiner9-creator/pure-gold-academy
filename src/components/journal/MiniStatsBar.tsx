'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useJournalStatsStore } from '@/store/journalStats'

export function MiniStatsBar() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const { stats: cachedStats, needsFetch, setStats, setLoading, isLoading: cacheLoading } = useJournalStatsStore()
  const [isLoading, setIsLoadingLocal] = useState(!cachedStats)

  const loadStats = useCallback(async () => {
    if (!profile?.id) return
    if (!needsFetch(profile.id)) {
      setIsLoadingLocal(false)
      return
    }

    setLoading(true)
    setIsLoadingLocal(true)

    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('outcome, r_multiple')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })

      if (error) throw error

      if (!entries || entries.length === 0) {
        setStats({
          totalTrades: 0, winRate: 0, totalR: 0, wins: 0, losses: 0,
          streak: 0, streakType: 'none',
        }, profile.id)
        setIsLoadingLocal(false)
        return
      }

      const wins = entries.filter(e => e.outcome === 'win').length
      const losses = entries.filter(e => e.outcome === 'loss').length
      const breakeven = entries.filter(e => e.outcome === 'breakeven').length
      const closedTrades = wins + losses + breakeven
      const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0

      const rMultiples = entries.filter(e => e.r_multiple !== null).map(e => e.r_multiple as number)
      const totalR = rMultiples.reduce((sum, r) => sum + r, 0)

      let streak = 0
      let streakType: 'win' | 'loss' | 'none' = 'none'
      if (entries.length > 0 && entries[0].outcome) {
        streakType = entries[0].outcome === 'win' ? 'win' : entries[0].outcome === 'loss' ? 'loss' : 'none'
        for (const entry of entries) {
          if (entry.outcome === streakType) {
            streak++
          } else {
            break
          }
        }
      }

      setStats({
        winRate, totalR, totalTrades: entries.length,
        streak, streakType, wins, losses,
      }, profile.id)
    } catch (error) {
      console.error('Error loading mini stats:', error)
    } finally {
      setIsLoadingLocal(false)
    }
  }, [profile?.id, supabase, needsFetch, setStats, setLoading])

  useEffect(() => {
    if (profile?.id) {
      loadStats()
    }
  }, [profile?.id, loadStats])

  const stats = cachedStats

  if (isLoading) {
    return (
      <div className="flex gap-4 p-3 glass-surface animate-pulse">
        <div className="h-8 w-20 skeleton-glass rounded" />
        <div className="h-8 w-20 skeleton-glass rounded" />
        <div className="h-8 w-20 skeleton-glass rounded" />
        <div className="h-8 w-20 skeleton-glass rounded" />
      </div>
    )
  }

  if (!stats || stats.totalTrades === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-6 p-3 glass-surface overflow-x-auto">
      {/* Win Rate */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg font-bold mono-num ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {stats.winRate.toFixed(0)}%
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">Win</span>
      </div>

      <div className="w-px h-6 bg-[var(--glass-surface-border)]" />

      {/* Total R */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg font-bold mono-num ${stats.totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(1)}R
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">Total</span>
      </div>

      <div className="w-px h-6 bg-[var(--glass-surface-border)]" />

      {/* W/L */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold mono-num">
          <span className="text-[var(--success)]">{stats.wins}</span>
          <span className="text-[var(--muted)]">/</span>
          <span className="text-[var(--danger)]">{stats.losses}</span>
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">W/L</span>
      </div>

      <div className="w-px h-6 bg-[var(--glass-surface-border)]" />

      {/* Streak */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold mono-num text-[var(--gold)]">
          {stats.streak}
        </span>
        <span className="text-[10px] text-[var(--muted)] uppercase">Streak</span>
      </div>
    </div>
  )
}
