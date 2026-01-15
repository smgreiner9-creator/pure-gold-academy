'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui'
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

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

  useEffect(() => {
    if (profile?.id) {
      loadStats()
    }
  }, [profile?.id])

  const loadStats = async () => {
    if (!profile?.id) return

    try {
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('outcome, r_multiple, trade_date')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })

      if (entries && entries.length > 0) {
        const wins = entries.filter(e => e.outcome === 'win').length
        const totalWithOutcome = entries.filter(e => e.outcome).length
        const avgR = entries.reduce((sum, e) => sum + (e.r_multiple || 0), 0) / entries.length

        // Calculate streak
        let streak = 0
        const sortedDates = [...new Set(entries.map(e => e.trade_date))].sort().reverse()

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

        setStats({
          totalTrades: entries.length,
          winRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
          avgRMultiple: avgR,
          journalStreak: streak,
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
