'use client'

import { useMemo } from 'react'
import type { JournalEntry } from '@/types/database'

interface EquityCurveProps {
  entries: JournalEntry[]
}

export function EquityCurve({ entries }: EquityCurveProps) {
  const chartData = useMemo(() => {
    // Filter entries with P&L data and sort by date
    const entriesWithPnl = entries
      .filter((e) => e.pnl !== null && e.outcome !== null)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())

    if (entriesWithPnl.length === 0) return null

    // Calculate cumulative P&L
    let cumulative = 0
    const points = entriesWithPnl.map((entry) => {
      cumulative += entry.pnl || 0
      return {
        date: entry.trade_date,
        pnl: entry.pnl || 0,
        cumulative,
        outcome: entry.outcome,
      }
    })

    // Find min/max for scaling
    const values = points.map((p) => p.cumulative)
    const min = Math.min(0, ...values)
    const max = Math.max(0, ...values)
    const range = max - min || 1

    return { points, min, max, range }
  }, [entries])

  const stats = useMemo(() => {
    const closedTrades = entries.filter((e) => e.outcome !== null)
    const wins = closedTrades.filter((e) => e.outcome === 'win').length
    const losses = closedTrades.filter((e) => e.outcome === 'loss').length
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0

    const pnlTrades = entries.filter((e) => e.pnl !== null)
    const totalPnl = pnlTrades.reduce((sum, e) => sum + (e.pnl || 0), 0)
    const avgWin = wins > 0
      ? pnlTrades.filter((e) => e.outcome === 'win').reduce((sum, e) => sum + (e.pnl || 0), 0) / wins
      : 0
    const avgLoss = losses > 0
      ? Math.abs(pnlTrades.filter((e) => e.outcome === 'loss').reduce((sum, e) => sum + (e.pnl || 0), 0) / losses)
      : 0

    // Calculate max drawdown
    let peak = 0
    let maxDrawdown = 0
    let cumulative = 0
    entries
      .filter((e) => e.pnl !== null)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())
      .forEach((entry) => {
        cumulative += entry.pnl || 0
        if (cumulative > peak) peak = cumulative
        const drawdown = peak - cumulative
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
      })

    return {
      totalTrades: closedTrades.length,
      wins,
      losses,
      winRate,
      totalPnl,
      avgWin,
      avgLoss,
      maxDrawdown,
      profitFactor: avgLoss > 0 ? (avgWin * wins) / (avgLoss * losses) : 0,
    }
  }, [entries])

  if (!chartData || chartData.points.length < 2) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-bold text-lg mb-4">Equity Curve</h3>
        <p className="text-[var(--muted)] text-center py-8">
          Need at least 2 closed trades with P&L data to show the equity curve.
        </p>
      </div>
    )
  }

  // Generate SVG path
  const width = 100
  const height = 40
  const padding = 2

  const pathD = chartData.points
    .map((point, i) => {
      const x = padding + ((width - padding * 2) * i) / (chartData.points.length - 1)
      const y = height - padding - ((point.cumulative - chartData.min) / chartData.range) * (height - padding * 2)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Zero line position
  const zeroY = height - padding - ((0 - chartData.min) / chartData.range) * (height - padding * 2)

  return (
    <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Equity Curve</h3>
        <span className={`text-xl font-bold mono-num ${stats.totalPnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
        </span>
      </div>

      {/* Chart */}
      <div className="relative h-48 mb-6">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line
            x1={padding}
            y1={zeroY}
            x2={width - padding}
            y2={zeroY}
            stroke="var(--card-border)"
            strokeWidth="0.2"
            strokeDasharray="1,1"
          />

          {/* Area fill */}
          <path
            d={`${pathD} L ${width - padding} ${zeroY} L ${padding} ${zeroY} Z`}
            fill={stats.totalPnl >= 0 ? 'var(--success)' : 'var(--danger)'}
            fillOpacity="0.1"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={stats.totalPnl >= 0 ? 'var(--success)' : 'var(--danger)'}
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {chartData.points.map((point, i) => {
            const x = padding + ((width - padding * 2) * i) / (chartData.points.length - 1)
            const y = height - padding - ((point.cumulative - chartData.min) / chartData.range) * (height - padding * 2)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="0.8"
                fill={point.outcome === 'win' ? 'var(--success)' : point.outcome === 'loss' ? 'var(--danger)' : 'var(--gold)'}
              />
            )
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute top-0 left-0 text-[10px] text-[var(--muted)] mono-num">
          ${chartData.max.toFixed(0)}
        </div>
        <div className="absolute bottom-0 left-0 text-[10px] text-[var(--muted)] mono-num">
          ${chartData.min.toFixed(0)}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 rounded-xl bg-black/40">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Win Rate</p>
          <p className={`text-lg font-bold mono-num ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {stats.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="p-3 rounded-xl bg-black/40">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Profit Factor</p>
          <p className={`text-lg font-bold mono-num ${stats.profitFactor >= 1 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {stats.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-black/40">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Avg Win</p>
          <p className="text-lg font-bold mono-num text-[var(--success)]">
            ${stats.avgWin.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-black/40">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Max Drawdown</p>
          <p className="text-lg font-bold mono-num text-[var(--danger)]">
            -${stats.maxDrawdown.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
