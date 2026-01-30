'use client'

import { useMemo } from 'react'
import type { JournalEntry } from '@/types/database'

interface TimeAnalysisProps {
  entries: JournalEntry[]
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function TimeAnalysis({ entries }: TimeAnalysisProps) {
  const dayOfWeekStats = useMemo(() => {
    const stats: Record<number, { total: number; wins: number; totalPnl: number }> = {}

    for (let i = 0; i < 7; i++) {
      stats[i] = { total: 0, wins: 0, totalPnl: 0 }
    }

    entries
      .filter((e) => e.outcome !== null)
      .forEach((entry) => {
        const day = new Date(entry.trade_date).getDay()
        stats[day].total++
        if (entry.outcome === 'win') stats[day].wins++
        if (entry.pnl !== null) stats[day].totalPnl += entry.pnl
      })

    return Object.entries(stats).map(([day, data]) => ({
      day: parseInt(day),
      dayName: dayNames[parseInt(day)],
      ...data,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    }))
  }, [entries])

  const monthlyStats = useMemo(() => {
    const stats: Record<string, { total: number; wins: number; totalPnl: number }> = {}

    entries
      .filter((e) => e.outcome !== null)
      .forEach((entry) => {
        const date = new Date(entry.trade_date)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!stats[key]) {
          stats[key] = { total: 0, wins: 0, totalPnl: 0 }
        }
        stats[key].total++
        if (entry.outcome === 'win') stats[key].wins++
        if (entry.pnl !== null) stats[key].totalPnl += entry.pnl
      })

    return Object.entries(stats)
      .map(([month, data]) => {
        const [year, m] = month.split('-')
        return {
          month,
          label: `${monthNames[parseInt(m) - 1]} ${year}`,
          ...data,
          winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6) // Last 6 months
  }, [entries])

  // Find best and worst days
  const tradingDays = dayOfWeekStats.filter((d) => d.total > 0)
  const bestDay = [...tradingDays].sort((a, b) => b.winRate - a.winRate)[0]
  const worstDay = [...tradingDays].sort((a, b) => a.winRate - b.winRate)[0]

  if (entries.filter((e) => e.outcome !== null).length === 0) {
    return (
      <div className="glass-surface p-6">
        <h3 className="font-bold text-lg mb-4">Time Analysis</h3>
        <p className="text-[var(--muted)] text-center py-8">
          No closed trades to analyze by time.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Day of Week Analysis */}
      <div className="glass-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Performance by Day</h3>
          <span className="material-symbols-outlined text-[var(--gold)]">calendar_today</span>
        </div>

        {/* Insight */}
        {bestDay && worstDay && bestDay.day !== worstDay.day && tradingDays.length > 1 && (
          <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 mb-6">
            <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">
              Key Insight
            </p>
            <p className="text-sm">
              Your best trading day is{' '}
              <span className="font-bold text-[var(--success)]">{bestDay.dayName}</span>{' '}
              ({bestDay.winRate.toFixed(0)}% win rate). Consider reducing activity on{' '}
              <span className="font-bold text-[var(--danger)]">{worstDay.dayName}</span>{' '}
              ({worstDay.winRate.toFixed(0)}% win rate).
            </p>
          </div>
        )}

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-2">
          {dayOfWeekStats.map(({ day, dayName, total, winRate, totalPnl }) => (
            <div
              key={day}
              className={`p-3 rounded-xl text-center ${
                total === 0
                  ? 'bg-black/20 opacity-50'
                  : 'glass-surface'
              }`}
            >
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase mb-2">
                {dayName.slice(0, 3)}
              </p>
              {total > 0 ? (
                <>
                  <p className={`text-lg font-bold mono-num ${winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {winRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">{total} trades</p>
                  <p className={`text-[10px] mono-num ${totalPnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--muted)]">-</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Performance */}
      <div className="glass-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Monthly Performance</h3>
          <span className="material-symbols-outlined text-[var(--gold)]">trending_up</span>
        </div>

        {monthlyStats.length > 0 ? (
          <div className="space-y-3">
            {monthlyStats.map(({ month, label, total, wins, winRate, totalPnl }) => (
              <div
                key={month}
                className="p-4 rounded-xl glass-surface"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{label}</span>
                  <span className={`font-bold mono-num ${totalPnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">{total} trades ({wins} wins)</span>
                  <span className={`font-semibold mono-num ${winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {winRate.toFixed(0)}% WR
                  </span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${winRate}%`,
                      backgroundColor: winRate >= 50 ? 'var(--success)' : 'var(--danger)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[var(--muted)] py-4">No monthly data available.</p>
        )}
      </div>
    </div>
  )
}
