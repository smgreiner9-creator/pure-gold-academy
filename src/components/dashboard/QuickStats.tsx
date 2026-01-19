'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui'
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { calculateStreak } from '@/lib/streakUtils'

interface Stats {
  totalTrades: number
  winRate: number
  avgRMultiple: number
  journalStreak: number
}

export function QuickStats() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    winRate: 0,
    avgRMultiple: 0,
    journalStreak: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadStats = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Fetch journal entries and check-ins in parallel
      const [entriesRes, checkinsRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('outcome, r_multiple, trade_date')
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
        const wins = entries.filter(e => e.outcome === 'win').length
        const totalWithOutcome = entries.filter(e => e.outcome).length
        const avgR = entries.reduce((sum, e) => sum + (e.r_multiple || 0), 0) / entries.length

        // Use shared streak utility with rest day support
        const tradeDates = [...new Set(entries.map(e => e.trade_date))]
        const checkinDates = checkins.map(c => c.check_date)
        const streakData = calculateStreak(tradeDates, checkinDates, 1)

        setStats({
          totalTrades: entries.length,
          winRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
          avgRMultiple: avgR,
          journalStreak: streakData.currentStreak,
        })
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

  const statCards = [
    {
      label: 'Total Trades',
      value: stats.totalTrades.toString(),
      icon: <Target size={20} />,
      color: 'text-[var(--gold)]',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      icon: stats.winRate >= 50 ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
      color: stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
    },
    {
      label: 'Avg R-Multiple',
      value: stats.avgRMultiple.toFixed(2),
      icon: <TrendingUp size={20} />,
      color: stats.avgRMultiple >= 1 ? 'text-[var(--success)]' : 'text-[var(--warning)]',
    },
    {
      label: 'Journal Streak',
      value: `${stats.journalStreak} days`,
      icon: <Calendar size={20} />,
      color: 'text-[var(--gold)]',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-[var(--card-border)] rounded w-1/2 mb-2" />
            <div className="h-8 bg-[var(--card-border)] rounded w-3/4" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--muted)]">{stat.label}</span>
            <span className={stat.color}>{stat.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </Card>
      ))}
    </div>
  )
}
