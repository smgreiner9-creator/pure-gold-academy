'use client'

import { useMemo } from 'react'
import type { JournalEntry } from '@/types/database'

interface PsychologyAnalysisProps {
  entries: JournalEntry[]
}

interface MindsetData {
  readiness: number | null
  tags: string[]
}

const ALL_TAGS = ['Revenge', 'FOMO', 'Confident', 'Uncertain', 'Tired']

export function PsychologyAnalysis({ entries }: PsychologyAnalysisProps) {
  // Parse mindset data from entries
  const entriesWithMindset = useMemo(() => {
    return entries
      .filter((e) => e.outcome !== null)
      .map((entry) => {
        const mindset = entry.pre_trade_mindset as MindsetData | null
        return { entry, mindset }
      })
  }, [entries])

  const hasMindsetData = useMemo(() => {
    return entriesWithMindset.some((e) => e.mindset !== null)
  }, [entriesWithMindset])

  // A) Readiness Score Impact
  const readinessStats = useMemo(() => {
    const stats: Record<number, { total: number; wins: number; totalR: number; rCount: number }> = {}
    for (let i = 1; i <= 5; i++) {
      stats[i] = { total: 0, wins: 0, totalR: 0, rCount: 0 }
    }

    entriesWithMindset.forEach(({ entry, mindset }) => {
      if (!mindset || mindset.readiness === null) return
      const level = mindset.readiness
      if (level < 1 || level > 5) return
      stats[level].total++
      if (entry.outcome === 'win') stats[level].wins++
      if (entry.r_multiple !== null) {
        stats[level].totalR += entry.r_multiple
        stats[level].rCount++
      }
    })

    return Object.entries(stats).map(([level, data]) => ({
      level: parseInt(level),
      total: data.total,
      wins: data.wins,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      avgR: data.rCount > 0 ? data.totalR / data.rCount : 0,
    }))
  }, [entriesWithMindset])

  const hasReadinessData = useMemo(() => {
    return readinessStats.some((s) => s.total > 0)
  }, [readinessStats])

  // Readiness insight
  const readinessInsight = useMemo(() => {
    if (!hasReadinessData) return null
    const highReadiness = readinessStats.filter((s) => s.level >= 4 && s.total > 0)
    const lowReadiness = readinessStats.filter((s) => s.level <= 2 && s.total > 0)

    const highTotal = highReadiness.reduce((sum, s) => sum + s.total, 0)
    const highWins = highReadiness.reduce((sum, s) => sum + s.wins, 0)
    const lowTotal = lowReadiness.reduce((sum, s) => sum + s.total, 0)
    const lowWins = lowReadiness.reduce((sum, s) => sum + s.wins, 0)

    if (highTotal === 0 || lowTotal === 0) return null

    const highWinRate = (highWins / highTotal) * 100
    const lowWinRate = (lowWins / lowTotal) * 100

    return {
      highWinRate,
      lowWinRate,
      highTotal,
      lowTotal,
    }
  }, [readinessStats, hasReadinessData])

  // B) Mindset Tag Impact
  const tagStats = useMemo(() => {
    const closedWithMindset = entriesWithMindset.filter((e) => e.mindset !== null)
    const totalClosed = closedWithMindset.length

    return ALL_TAGS.map((tag) => {
      const withTag = closedWithMindset.filter((e) => e.mindset!.tags.includes(tag))
      const withoutTag = closedWithMindset.filter((e) => !e.mindset!.tags.includes(tag))

      const winsWithTag = withTag.filter((e) => e.entry.outcome === 'win').length
      const winsWithoutTag = withoutTag.filter((e) => e.entry.outcome === 'win').length

      const winRateWith = withTag.length > 0 ? (winsWithTag / withTag.length) * 100 : 0
      const winRateWithout = withoutTag.length > 0 ? (winsWithoutTag / withoutTag.length) * 100 : 0

      const rWithTag = withTag.filter((e) => e.entry.r_multiple !== null)
      const rWithoutTag = withoutTag.filter((e) => e.entry.r_multiple !== null)

      const avgRWith = rWithTag.length > 0
        ? rWithTag.reduce((sum, e) => sum + (e.entry.r_multiple || 0), 0) / rWithTag.length
        : 0
      const avgRWithout = rWithoutTag.length > 0
        ? rWithoutTag.reduce((sum, e) => sum + (e.entry.r_multiple || 0), 0) / rWithoutTag.length
        : 0

      const impact = winRateWith - winRateWithout

      return {
        tag,
        countWith: withTag.length,
        countWithout: withoutTag.length,
        totalClosed,
        winRateWith,
        winRateWithout,
        avgRWith,
        avgRWithout,
        impact,
      }
    }).filter((t) => t.countWith > 0)
  }, [entriesWithMindset])

  // C) Readiness Trend over time
  const readinessTrend = useMemo(() => {
    return entriesWithMindset
      .filter((e) => e.mindset?.readiness !== null && e.mindset?.readiness !== undefined)
      .map((e) => ({
        date: e.entry.trade_date,
        readiness: e.mindset!.readiness!,
        outcome: e.entry.outcome,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [entriesWithMindset])

  // D) Combined Insight
  const combinedInsight = useMemo(() => {
    const closedWithMindset = entriesWithMindset.filter(
      (e) => e.mindset !== null && e.mindset.readiness !== null
    )
    if (closedWithMindset.length < 5) return null

    // Find best combo: high readiness + specific tag
    let bestCombo = { readinessRange: '', tag: '', winRate: 0, count: 0 }
    let worstCombo = { readinessRange: '', tag: '', winRate: 100, count: 0 }

    const readinessRanges = [
      { label: '4-5', min: 4, max: 5 },
      { label: '1-2', min: 1, max: 2 },
      { label: '3', min: 3, max: 3 },
    ]

    for (const range of readinessRanges) {
      for (const tag of ALL_TAGS) {
        const matching = closedWithMindset.filter(
          (e) =>
            e.mindset!.readiness! >= range.min &&
            e.mindset!.readiness! <= range.max &&
            e.mindset!.tags.includes(tag)
        )
        if (matching.length < 2) continue

        const wins = matching.filter((e) => e.entry.outcome === 'win').length
        const winRate = (wins / matching.length) * 100

        if (winRate > bestCombo.winRate || (winRate === bestCombo.winRate && matching.length > bestCombo.count)) {
          bestCombo = { readinessRange: range.label, tag, winRate, count: matching.length }
        }
        if (winRate < worstCombo.winRate || (winRate === worstCombo.winRate && matching.length > worstCombo.count)) {
          worstCombo = { readinessRange: range.label, tag, winRate, count: matching.length }
        }
      }
    }

    return {
      best: bestCombo.count >= 2 ? bestCombo : null,
      worst: worstCombo.count >= 2 ? worstCombo : null,
    }
  }, [entriesWithMindset])

  // Empty state
  if (!hasMindsetData) {
    return (
      <div className="glass-surface p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--gold)]">neurology</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Psychology Insights</h2>
        <p className="text-[var(--muted)] max-w-md mx-auto">
          Start capturing your pre-trade mindset to see insights here. When logging a trade, rate your readiness and tag your mental state.
        </p>
      </div>
    )
  }

  // SVG chart for readiness trend
  const renderReadinessTrend = () => {
    if (readinessTrend.length < 2) return null

    const width = 100
    const height = 30
    const padding = 2
    const minVal = 1
    const maxVal = 5
    const range = maxVal - minVal

    const pathD = readinessTrend
      .map((point, i) => {
        const x = padding + ((width - padding * 2) * i) / (readinessTrend.length - 1)
        const y = height - padding - ((point.readiness - minVal) / range) * (height - padding * 2)
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    return (
      <div className="glass-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Readiness Trend</h3>
          <span className="material-symbols-outlined text-[var(--gold)]">trending_up</span>
        </div>

        <div className="relative h-40 mb-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Grid lines for each level */}
            {[1, 2, 3, 4, 5].map((level) => {
              const y = height - padding - ((level - minVal) / range) * (height - padding * 2)
              return (
                <line
                  key={level}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="var(--glass-surface-border)"
                  strokeWidth="0.15"
                  strokeDasharray="1,1"
                />
              )
            })}

            {/* Area fill */}
            <path
              d={`${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
              fill="var(--gold)"
              fillOpacity="0.08"
            />

            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke="var(--gold)"
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {readinessTrend.map((point, i) => {
              const x = padding + ((width - padding * 2) * i) / (readinessTrend.length - 1)
              const y = height - padding - ((point.readiness - minVal) / range) * (height - padding * 2)
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="0.6"
                  fill={point.outcome === 'win' ? 'var(--success)' : point.outcome === 'loss' ? 'var(--danger)' : 'var(--gold)'}
                />
              )
            })}
          </svg>

          {/* Y-axis labels */}
          <div className="absolute top-0 left-0 text-[10px] text-[var(--muted)] mono-num">5</div>
          <div className="absolute bottom-0 left-0 text-[10px] text-[var(--muted)] mono-num">1</div>
        </div>

        <p className="text-xs text-[var(--muted)]">
          Your readiness scores over {readinessTrend.length} trades. Green dots = wins, red dots = losses.
        </p>
      </div>
    )
  }

  const maxReadinessTotal = Math.max(...readinessStats.map((s) => s.total), 1)

  return (
    <div className="space-y-6">
      {/* A) Readiness Score Impact */}
      {hasReadinessData && (
        <div className="glass-surface p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Readiness Score Impact</h3>
            <span className="material-symbols-outlined text-[var(--gold)]">speed</span>
          </div>

          {/* Insight Card */}
          {readinessInsight && (
            <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 mb-6">
              <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">
                Key Insight
              </p>
              <p className="text-sm">
                Readiness 4-5 trades win{' '}
                <span className="font-bold text-[var(--success)]">
                  {readinessInsight.highWinRate.toFixed(0)}%
                </span>{' '}
                vs{' '}
                <span className="font-bold text-[var(--danger)]">
                  {readinessInsight.lowWinRate.toFixed(0)}%
                </span>{' '}
                at 1-2 ({readinessInsight.highTotal + readinessInsight.lowTotal} trades analyzed).
              </p>
            </div>
          )}

          {/* Bars */}
          <div className="space-y-4">
            {readinessStats.map(({ level, total, winRate, avgR }) => (
              <div key={level}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--gold)] text-black flex items-center justify-center text-sm font-bold">
                      {level}
                    </div>
                    <span className="text-sm font-medium">Readiness {level}</span>
                    <span className="text-xs text-[var(--muted)]">({total} trades)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-sm font-bold mono-num ${
                        total > 0 ? (winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]') : 'text-[var(--muted)]'
                      }`}
                    >
                      {total > 0 ? `${winRate.toFixed(0)}%` : '-'}
                    </span>
                    <span
                      className={`text-xs mono-num ${
                        total > 0 ? (avgR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]') : 'text-[var(--muted)]'
                      }`}
                    >
                      {total > 0 ? `${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R` : '-'}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: total > 0 ? `${(total / maxReadinessTotal) * 100}%` : '0%',
                      backgroundColor: total > 0 ? (winRate >= 50 ? 'var(--success)' : 'var(--danger)') : 'var(--glass-surface-border)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* B) Mindset Tag Impact */}
      {tagStats.length > 0 && (
        <div className="glass-surface p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Mindset Tag Impact</h3>
            <span className="material-symbols-outlined text-[var(--gold)]">label</span>
          </div>

          {/* Tag insight - find worst tag */}
          {(() => {
            const worstTag = tagStats.reduce((worst, curr) =>
              curr.impact < worst.impact ? curr : worst
            , tagStats[0])
            if (worstTag && worstTag.impact < -5 && worstTag.countWith >= 2) {
              return (
                <div className="p-4 rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/20 mb-6">
                  <p className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-widest mb-2">
                    Warning Pattern
                  </p>
                  <p className="text-sm">
                    When you tag <span className="font-bold text-[var(--danger)]">{worstTag.tag}</span>,
                    your avg R is{' '}
                    <span className="font-bold mono-num text-[var(--danger)]">
                      {worstTag.avgRWith >= 0 ? '+' : ''}{worstTag.avgRWith.toFixed(2)}R
                    </span>{' '}
                    vs{' '}
                    <span className="font-bold mono-num text-[var(--success)]">
                      {worstTag.avgRWithout >= 0 ? '+' : ''}{worstTag.avgRWithout.toFixed(2)}R
                    </span>{' '}
                    normally.
                  </p>
                </div>
              )
            }
            return null
          })()}

          <div className="space-y-4">
            {tagStats.map(({ tag, countWith, winRateWith, winRateWithout, avgRWith, avgRWithout, impact }) => (
              <div
                key={tag}
                className="p-4 rounded-xl bg-black/20 border border-[var(--glass-surface-border)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        impact >= 0
                          ? 'bg-[var(--success)]/10 text-[var(--success)]'
                          : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                      }`}
                    >
                      {tag}
                    </span>
                    <span className="text-xs text-[var(--muted)]">({countWith} trades)</span>
                  </div>
                  <span
                    className={`text-sm font-bold mono-num ${
                      impact >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {impact >= 0 ? '+' : ''}{impact.toFixed(0)}% impact
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[var(--muted)] mb-1">Win Rate (with tag)</p>
                    <p className={`font-bold mono-num ${winRateWith >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {winRateWith.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)] mb-1">Win Rate (without)</p>
                    <p className={`font-bold mono-num ${winRateWithout >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {winRateWithout.toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)] mb-1">Avg R (with tag)</p>
                    <p className={`font-bold mono-num ${avgRWith >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {avgRWith >= 0 ? '+' : ''}{avgRWith.toFixed(2)}R
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)] mb-1">Avg R (without)</p>
                    <p className={`font-bold mono-num ${avgRWithout >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {avgRWithout >= 0 ? '+' : ''}{avgRWithout.toFixed(2)}R
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* C) Readiness Trend */}
      {renderReadinessTrend()}

      {/* D) Combined Insight */}
      {combinedInsight && (combinedInsight.best || combinedInsight.worst) && (
        <div className="glass-surface p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Combined Patterns</h3>
            <span className="material-symbols-outlined text-[var(--gold)]">insights</span>
          </div>

          <div className="space-y-4">
            {combinedInsight.best && (
              <div className="p-4 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
                <p className="text-[10px] font-bold text-[var(--success)] uppercase tracking-widest mb-2">
                  Best Combination
                </p>
                <p className="text-sm">
                  Your best results come when readiness is{' '}
                  <span className="font-bold">{combinedInsight.best.readinessRange}</span> and you feel{' '}
                  <span className="font-bold text-[var(--success)]">{combinedInsight.best.tag}</span> -{' '}
                  <span className="font-bold mono-num text-[var(--success)]">
                    {combinedInsight.best.winRate.toFixed(0)}% win rate
                  </span>{' '}
                  over {combinedInsight.best.count} trades.
                </p>
              </div>
            )}

            {combinedInsight.worst && (
              <div className="p-4 rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/20">
                <p className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-widest mb-2">
                  Toxic Pattern
                </p>
                <p className="text-sm">
                  Watch out when readiness is{' '}
                  <span className="font-bold">{combinedInsight.worst.readinessRange}</span> and you feel{' '}
                  <span className="font-bold text-[var(--danger)]">{combinedInsight.worst.tag}</span> -{' '}
                  <span className="font-bold mono-num text-[var(--danger)]">
                    {combinedInsight.worst.winRate.toFixed(0)}% win rate
                  </span>{' '}
                  over {combinedInsight.worst.count} trades.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
