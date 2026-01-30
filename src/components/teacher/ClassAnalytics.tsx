'use client'

import { useMemo } from 'react'
import type { JournalEntry, EmotionType } from '@/types/database'

interface ClassAnalyticsProps {
  entries: JournalEntry[]
}

const emotionLabels: Record<EmotionType, string> = {
  calm: 'Calm',
  confident: 'Confident',
  neutral: 'Neutral',
  anxious: 'Anxious',
  fearful: 'Fearful',
  greedy: 'Greedy',
  frustrated: 'Frustrated',
}

const ruleLabels: Record<string, string> = {
  plan: 'Followed trading plan',
  risk: 'Proper risk management',
  confirmation: 'Waited for confirmation',
  session: 'Optimal session',
  news: 'Checked calendar',
  emotional: 'Good emotional state',
  stop: 'Set stop loss first',
  journal: 'Documented thesis',
}

export function ClassAnalytics({ entries }: ClassAnalyticsProps) {
  // Win rate trend by week
  const winRateTrend = useMemo(() => {
    const closedEntries = entries
      .filter((e) => e.outcome !== null)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())

    if (closedEntries.length < 2) return []

    // Group by ISO week
    const weekMap = new Map<string, { wins: number; total: number }>()
    closedEntries.forEach((entry) => {
      const d = new Date(entry.trade_date)
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const weekNum = Math.ceil(
        ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      )
      const weekKey = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`

      const existing = weekMap.get(weekKey) || { wins: 0, total: 0 }
      existing.total++
      if (entry.outcome === 'win') existing.wins++
      weekMap.set(weekKey, existing)
    })

    return Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        total: data.total,
      }))
      .slice(-12) // Last 12 weeks
  }, [entries])

  // Average R-multiple trend by week
  const rMultipleTrend = useMemo(() => {
    const entriesWithR = entries
      .filter((e) => e.r_multiple !== null && e.outcome !== null)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime())

    if (entriesWithR.length < 2) return []

    const weekMap = new Map<string, { totalR: number; count: number }>()
    entriesWithR.forEach((entry) => {
      const d = new Date(entry.trade_date)
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const weekNum = Math.ceil(
        ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      )
      const weekKey = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`

      const existing = weekMap.get(weekKey) || { totalR: 0, count: 0 }
      existing.totalR += entry.r_multiple!
      existing.count++
      weekMap.set(weekKey, existing)
    })

    return Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        avgR: data.count > 0 ? data.totalR / data.count : 0,
        count: data.count,
      }))
      .slice(-12)
  }, [entries])

  // Emotion distribution across all students
  const emotionDistribution = useMemo(() => {
    const emotionMap = new Map<EmotionType, { total: number; wins: number }>()
    entries
      .filter((e) => e.outcome !== null)
      .forEach((entry) => {
        const emotion = entry.emotion_before
        const existing = emotionMap.get(emotion) || { total: 0, wins: 0 }
        existing.total++
        if (entry.outcome === 'win') existing.wins++
        emotionMap.set(emotion, existing)
      })

    return Array.from(emotionMap.entries())
      .map(([emotion, data]) => ({
        emotion,
        total: data.total,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [entries])

  // Rule adherence summary
  const ruleAdherenceSummary = useMemo(() => {
    const closedEntries = entries.filter((e) => e.outcome !== null)
    const ruleKeys = Object.keys(ruleLabels)

    return ruleKeys.map((rule) => {
      let followed = 0
      let winsWhenFollowed = 0
      let total = 0

      closedEntries.forEach((entry) => {
        const rulesFollowed = Array.isArray(entry.rules_followed) ? (entry.rules_followed as string[]) : []
        total++
        if (rulesFollowed.includes(rule)) {
          followed++
          if (entry.outcome === 'win') winsWhenFollowed++
        }
      })

      return {
        rule,
        label: ruleLabels[rule],
        adherenceRate: total > 0 ? (followed / total) * 100 : 0,
        winRateWhenFollowed: followed > 0 ? (winsWhenFollowed / followed) * 100 : 0,
      }
    }).sort((a, b) => a.adherenceRate - b.adherenceRate)
  }, [entries])

  const closedEntries = entries.filter((e) => e.outcome !== null)

  if (closedEntries.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-surface text-center">
        <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4 block">analytics</span>
        <h3 className="text-lg font-bold mb-2">No Class Data Yet</h3>
        <p className="text-[var(--muted)] text-sm">Once students start journaling trades, class analytics will appear here.</p>
      </div>
    )
  }

  // Render SVG line chart
  const renderLineChart = (
    data: { value: number; label: string }[],
    color: string,
    yMin: number,
    yMax: number,
    formatY: (v: number) => string
  ) => {
    if (data.length < 2) return null

    const width = 100
    const height = 35
    const padding = 3
    const range = yMax - yMin || 1

    const pathD = data
      .map((point, i) => {
        const x = padding + ((width - padding * 2) * i) / (data.length - 1)
        const y = height - padding - ((point.value - yMin) / range) * (height - padding * 2)
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    // Zero line position (if applicable)
    const zeroY = yMin < 0 && yMax > 0
      ? height - padding - ((0 - yMin) / range) * (height - padding * 2)
      : null

    return (
      <div className="relative h-44">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Zero line */}
          {zeroY !== null && (
            <line
              x1={padding}
              y1={zeroY}
              x2={width - padding}
              y2={zeroY}
              stroke="var(--glass-surface-border)"
              strokeWidth="0.15"
              strokeDasharray="0.5,0.5"
            />
          )}

          {/* Area fill */}
          <path
            d={`${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
            fill={color}
            fillOpacity="0.08"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {data.map((point, i) => {
            const x = padding + ((width - padding * 2) * i) / (data.length - 1)
            const y = height - padding - ((point.value - yMin) / range) * (height - padding * 2)
            return (
              <circle key={i} cx={x} cy={y} r="0.6" fill={color}>
                <title>{point.label}: {formatY(point.value)}</title>
              </circle>
            )
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute top-0 left-0 text-[10px] text-[var(--muted)] mono-num">
          {formatY(yMax)}
        </div>
        <div className="absolute bottom-0 left-0 text-[10px] text-[var(--muted)] mono-num">
          {formatY(yMin)}
        </div>
      </div>
    )
  }

  const winRateValues = winRateTrend.map((w) => w.winRate)
  const wrMin = Math.min(0, ...winRateValues)
  const wrMax = Math.max(100, ...winRateValues)

  const rValues = rMultipleTrend.map((r) => r.avgR)
  const rMin = rValues.length > 0 ? Math.min(0, ...rValues) : 0
  const rMax = rValues.length > 0 ? Math.max(0, ...rValues) : 1

  const maxEmotionTotal = emotionDistribution.length > 0 ? Math.max(...emotionDistribution.map((e) => e.total)) : 1

  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Win Rate Trend */}
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold">Class Win Rate Trend</h4>
            <span className="material-symbols-outlined text-[var(--gold)]">trending_up</span>
          </div>
          {winRateTrend.length >= 2 ? (
            renderLineChart(
              winRateTrend.map((w) => ({ value: w.winRate, label: w.week })),
              'var(--gold)',
              wrMin,
              wrMax,
              (v) => `${v.toFixed(0)}%`
            )
          ) : (
            <p className="text-sm text-[var(--muted)] py-8 text-center">Need at least 2 weeks of data.</p>
          )}
        </div>

        {/* Avg R-Multiple Trend */}
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold">Average R-Multiple Trend</h4>
            <span className="material-symbols-outlined text-[var(--gold)]">show_chart</span>
          </div>
          {rMultipleTrend.length >= 2 ? (
            renderLineChart(
              rMultipleTrend.map((r) => ({ value: r.avgR, label: r.week })),
              'var(--success)',
              rMin,
              rMax,
              (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`
            )
          ) : (
            <p className="text-sm text-[var(--muted)] py-8 text-center">Need at least 2 weeks of data with R-multiples.</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Emotion Patterns */}
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold">Class Emotion Patterns</h4>
            <span className="material-symbols-outlined text-[var(--gold)]">psychology</span>
          </div>
          <div className="space-y-3">
            {emotionDistribution.map(({ emotion, total, winRate }) => (
              <div key={emotion}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm capitalize">{emotionLabels[emotion] || emotion}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--muted)]">{total} trades</span>
                    <span className={`text-sm font-bold mono-num ${winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {winRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(total / maxEmotionTotal) * 100}%`,
                      backgroundColor: winRate >= 50 ? 'var(--success)' : 'var(--danger)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Adherence Summary */}
        <div className="p-6 rounded-2xl glass-surface">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold">Rule Adherence Summary</h4>
            <span className="material-symbols-outlined text-[var(--gold)]">checklist</span>
          </div>
          <div className="space-y-3">
            {ruleAdherenceSummary.map(({ rule, label, adherenceRate, winRateWhenFollowed }) => (
              <div key={rule}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm truncate mr-2">{label}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs mono-num ${winRateWhenFollowed >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {adherenceRate > 0 ? `${winRateWhenFollowed.toFixed(0)}% WR` : '-'}
                    </span>
                    <span className={`text-sm font-bold mono-num ${
                      adherenceRate >= 75 ? 'text-[var(--success)]' : adherenceRate >= 50 ? 'text-[var(--gold)]' : 'text-[var(--danger)]'
                    }`}>
                      {adherenceRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${adherenceRate}%`,
                      backgroundColor:
                        adherenceRate >= 75 ? 'var(--success)' : adherenceRate >= 50 ? 'var(--gold)' : 'var(--danger)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
