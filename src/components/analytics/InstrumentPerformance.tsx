'use client'

import { useMemo } from 'react'
import type { JournalEntry } from '@/types/database'

interface InstrumentPerformanceProps {
  entries: JournalEntry[]
  expanded?: boolean
}

export function InstrumentPerformance({ entries, expanded = false }: InstrumentPerformanceProps) {
  const instrumentStats = useMemo(() => {
    const stats: Record<string, { total: number; wins: number; losses: number; totalPnl: number; totalR: number }> = {}

    entries
      .filter((e) => e.outcome !== null)
      .forEach((entry) => {
        const instrument = entry.instrument
        if (!stats[instrument]) {
          stats[instrument] = { total: 0, wins: 0, losses: 0, totalPnl: 0, totalR: 0 }
        }
        stats[instrument].total++
        if (entry.outcome === 'win') stats[instrument].wins++
        if (entry.outcome === 'loss') stats[instrument].losses++
        if (entry.pnl !== null) stats[instrument].totalPnl += entry.pnl
        if (entry.r_multiple !== null) stats[instrument].totalR += entry.r_multiple
      })

    // Sort by total trades
    return Object.entries(stats)
      .map(([instrument, data]) => ({
        instrument,
        ...data,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        avgR: data.total > 0 ? data.totalR / data.total : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [entries])

  // Find best performing instrument
  const bestInstrument = [...instrumentStats].sort((a, b) => b.winRate - a.winRate)[0]
  const worstInstrument = [...instrumentStats].sort((a, b) => a.winRate - b.winRate)[0]

  if (instrumentStats.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-bold text-lg mb-4">Instrument Performance</h3>
        <p className="text-[var(--muted)] text-center py-8">
          No closed trades to analyze by instrument.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Instrument Performance</h3>
        <span className="material-symbols-outlined text-[var(--gold)]">candlestick_chart</span>
      </div>

      {/* Insight Card */}
      {bestInstrument && worstInstrument && bestInstrument.instrument !== worstInstrument.instrument && instrumentStats.length > 1 && (
        <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 mb-6">
          <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">
            Key Insight
          </p>
          <p className="text-sm">
            Your best performing instrument is{' '}
            <span className="font-bold text-[var(--success)]">{bestInstrument.instrument}</span>{' '}
            ({bestInstrument.winRate.toFixed(0)}% win rate). Consider{' '}
            {worstInstrument.winRate < 40 ? (
              <>
                avoiding <span className="font-bold text-[var(--danger)]">{worstInstrument.instrument}</span>{' '}
                ({worstInstrument.winRate.toFixed(0)}% win rate).
              </>
            ) : (
              'focusing on your best pairs.'
            )}
          </p>
        </div>
      )}

      {/* Instrument Table */}
      <div className="space-y-3">
        {instrumentStats.slice(0, expanded ? undefined : 5).map(({ instrument, total, wins, losses, winRate, totalPnl, avgR }) => (
          <div
            key={instrument}
            className="p-4 rounded-xl bg-black/40 border border-[var(--card-border)]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[var(--gold)]">{instrument}</span>
                <span className="text-xs text-[var(--muted)]">{total} trades</span>
              </div>
              <span className={`text-lg font-bold mono-num ${winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {winRate.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-[10px] text-[var(--muted)] uppercase">Wins</p>
                <p className="font-semibold text-[var(--success)] mono-num">{wins}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted)] uppercase">Losses</p>
                <p className="font-semibold text-[var(--danger)] mono-num">{losses}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted)] uppercase">P&L</p>
                <p className={`font-semibold mono-num ${totalPnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted)] uppercase">Avg R</p>
                <p className={`font-semibold mono-num ${avgR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {avgR >= 0 ? '+' : ''}{avgR.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!expanded && instrumentStats.length > 5 && (
        <p className="text-center text-sm text-[var(--muted)] mt-4">
          +{instrumentStats.length - 5} more instruments
        </p>
      )}
    </div>
  )
}
