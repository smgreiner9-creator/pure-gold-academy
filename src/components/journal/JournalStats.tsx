'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SkeletonStats } from '@/components/ui/Skeleton'
import type { EmotionType } from '@/types/database'

interface Stats {
  totalTrades: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  totalR: number
  avgR: number
  bestR: number
  worstR: number
  currentStreak: number
  longestStreak: number
  instrumentStats: { instrument: string; trades: number; winRate: number; totalR: number }[]
  emotionStats: { emotion: EmotionType; trades: number; winRate: number }[]
}

export function JournalStats() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const loadStats = useCallback(async () => {
    if (!profile?.id) return

    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: true })

      if (error) throw error

      if (!entries || entries.length === 0) {
        setStats(null)
        return
      }

      // Calculate basic stats
      const wins = entries.filter(e => e.outcome === 'win').length
      const losses = entries.filter(e => e.outcome === 'loss').length
      const breakeven = entries.filter(e => e.outcome === 'breakeven').length
      const closedTrades = wins + losses + breakeven
      const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0

      // R-multiple stats
      const rMultiples = entries.filter(e => e.r_multiple !== null).map(e => e.r_multiple as number)
      const totalR = rMultiples.reduce((sum, r) => sum + r, 0)
      const avgR = rMultiples.length > 0 ? totalR / rMultiples.length : 0
      const bestR = rMultiples.length > 0 ? Math.max(...rMultiples) : 0
      const worstR = rMultiples.length > 0 ? Math.min(...rMultiples) : 0

      // Streak calculation
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0

      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].outcome === 'win') {
          tempStreak++
          if (i === entries.length - 1 || currentStreak === 0) {
            currentStreak = tempStreak
          }
        } else if (entries[i].outcome === 'loss') {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 0
          if (currentStreak > 0) break
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak)

      // Instrument stats
      const instrumentMap = new Map<string, { trades: number; wins: number; rTotal: number }>()
      entries.forEach(entry => {
        const current = instrumentMap.get(entry.instrument) || { trades: 0, wins: 0, rTotal: 0 }
        current.trades++
        if (entry.outcome === 'win') current.wins++
        if (entry.r_multiple !== null) current.rTotal += entry.r_multiple
        instrumentMap.set(entry.instrument, current)
      })

      const instrumentStats = Array.from(instrumentMap.entries())
        .map(([instrument, data]) => ({
          instrument,
          trades: data.trades,
          winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
          totalR: data.rTotal,
        }))
        .sort((a, b) => b.totalR - a.totalR)
        .slice(0, 5)

      // Emotion stats
      const emotionMap = new Map<EmotionType, { trades: number; wins: number }>()
      entries.forEach(entry => {
        if (entry.emotion_before) {
          const current = emotionMap.get(entry.emotion_before) || { trades: 0, wins: 0 }
          current.trades++
          if (entry.outcome === 'win') current.wins++
          emotionMap.set(entry.emotion_before, current)
        }
      })

      const emotionStats = Array.from(emotionMap.entries())
        .map(([emotion, data]) => ({
          emotion,
          trades: data.trades,
          winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        }))
        .sort((a, b) => b.winRate - a.winRate)

      setStats({
        totalTrades: entries.length,
        wins,
        losses,
        breakeven,
        winRate,
        totalR,
        avgR,
        bestR,
        worstR,
        currentStreak,
        longestStreak,
        instrumentStats,
        emotionStats,
      })
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

  const getEmotionLabel = (emotion: EmotionType) => {
    const labels: Record<EmotionType, string> = {
      calm: 'Calm',
      confident: 'Confident',
      anxious: 'Anxious',
      fearful: 'Fearful',
      greedy: 'Greedy',
      frustrated: 'Frustrated',
      neutral: 'Neutral',
    }
    return labels[emotion] || emotion
  }

  const getEmotionIcon = (emotion: EmotionType) => {
    const icons: Record<EmotionType, string> = {
      calm: 'spa',
      confident: 'psychology',
      anxious: 'warning',
      fearful: 'sentiment_stressed',
      greedy: 'attach_money',
      frustrated: 'sentiment_dissatisfied',
      neutral: 'sentiment_neutral',
    }
    return icons[emotion] || 'sentiment_neutral'
  }

  if (isLoading) {
    return <SkeletonStats count={4} />
  }

  if (!stats || stats.totalTrades === 0) {
    return null
  }

  const closedTrades = stats.wins + stats.losses + stats.breakeven

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Performance Overview</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--gold)] hover:opacity-80 transition-opacity flex items-center gap-1 text-xs"
          >
            {isExpanded ? 'Less' : 'More'}
            <span className="material-symbols-outlined text-sm">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Win Rate</p>
            <p className={`text-2xl font-bold mono-num ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.winRate.toFixed(1)}%
            </p>
            <p className="text-[10px] text-[var(--muted)]">{stats.wins}W / {stats.losses}L / {stats.breakeven}BE</p>
          </div>

          <div className="p-4 rounded-xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Total R</p>
            <p className={`text-2xl font-bold mono-num ${stats.totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {stats.totalR >= 0 ? '+' : ''}{stats.totalR.toFixed(1)}R
            </p>
            <p className="text-[10px] text-[var(--muted)]">Avg: {stats.avgR >= 0 ? '+' : ''}{stats.avgR.toFixed(2)}R</p>
          </div>

          <div className="p-4 rounded-xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Total Trades</p>
            <p className="text-2xl font-bold text-[var(--gold)] mono-num">{stats.totalTrades}</p>
            <p className="text-[10px] text-[var(--muted)]">{closedTrades} closed</p>
          </div>

          <div className="p-4 rounded-xl glass-surface">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Win Streak</p>
            <p className="text-2xl font-bold text-[var(--gold)] mono-num">{stats.currentStreak}</p>
            <p className="text-[10px] text-[var(--muted)]">Best: {stats.longestStreak}</p>
          </div>
        </div>

        {/* Win/Loss Visual Bar */}
        {closedTrades > 0 && (
          <div className="mt-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-black/40">
              <div
                className="bg-[var(--success)] transition-all"
                style={{ width: `${(stats.wins / closedTrades) * 100}%` }}
              />
              <div
                className="bg-[var(--warning)] transition-all"
                style={{ width: `${(stats.breakeven / closedTrades) * 100}%` }}
              />
              <div
                className="bg-[var(--danger)] transition-all"
                style={{ width: `${(stats.losses / closedTrades) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                Wins ({stats.wins})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                BE ({stats.breakeven})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                Losses ({stats.losses})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Stats */}
      {isExpanded && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Best/Worst R */}
          <div className="p-6 rounded-2xl glass-surface">
            <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">R-Multiple Range</h3>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Best Trade</p>
                <p className="text-xl font-bold text-[var(--success)] mono-num">+{stats.bestR.toFixed(1)}R</p>
              </div>
              <div className="flex-1 mx-4">
                <div className="h-2 bg-black/40 rounded-full relative">
                  <div
                    className="absolute h-full bg-gradient-to-r from-[var(--danger)] via-[var(--warning)] to-[var(--success)] rounded-full"
                    style={{ width: '100%' }}
                  />
                  {stats.avgR !== 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-[var(--gold)]"
                      style={{
                        left: `${Math.min(100, Math.max(0, ((stats.avgR - stats.worstR) / (stats.bestR - stats.worstR)) * 100))}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  )}
                </div>
                <p className="text-center text-[10px] text-[var(--muted)] mt-2">Avg: {stats.avgR >= 0 ? '+' : ''}{stats.avgR.toFixed(2)}R</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[var(--muted)] uppercase mb-1">Worst Trade</p>
                <p className="text-xl font-bold text-[var(--danger)] mono-num">{stats.worstR.toFixed(1)}R</p>
              </div>
            </div>
          </div>

          {/* Emotion Analysis */}
          {stats.emotionStats.length > 0 && (
            <div className="p-6 rounded-2xl glass-surface">
              <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">Emotion Analysis</h3>
              <div className="space-y-2">
                {stats.emotionStats.slice(0, 4).map(({ emotion, trades, winRate }) => (
                  <div key={emotion} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg text-[var(--gold)]">{getEmotionIcon(emotion)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{getEmotionLabel(emotion)}</span>
                        <span className={`text-xs font-bold mono-num ${winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          {winRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${winRate >= 50 ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-[var(--muted)]">{trades} trades</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Instruments */}
          {stats.instrumentStats.length > 0 && (
            <div className="p-6 rounded-2xl glass-surface md:col-span-2">
              <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-4">Top Instruments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.instrumentStats.map(({ instrument, trades, winRate, totalR }) => (
                  <div key={instrument} className="p-3 rounded-xl glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{instrument}</span>
                      <span className={`text-sm font-bold mono-num ${totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}R
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                      <span>{trades} trades</span>
                      <span className={winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {winRate.toFixed(0)}% win
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
