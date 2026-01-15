'use client'

import { useMemo } from 'react'
import type { JournalEntry } from '@/types/database'

interface RuleAdherenceProps {
  entries: JournalEntry[]
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

export function RuleAdherence({ entries }: RuleAdherenceProps) {
  const ruleStats = useMemo(() => {
    const stats: Record<string, { followed: number; notFollowed: number; winsWhenFollowed: number; winsWhenNot: number }> = {}

    // Initialize all known rules
    Object.keys(ruleLabels).forEach((rule) => {
      stats[rule] = { followed: 0, notFollowed: 0, winsWhenFollowed: 0, winsWhenNot: 0 }
    })

    const closedEntries = entries.filter((e) => e.outcome !== null)

    closedEntries.forEach((entry) => {
      const rulesFollowed = Array.isArray(entry.rules_followed) ? entry.rules_followed as string[] : []
      const isWin = entry.outcome === 'win'

      Object.keys(ruleLabels).forEach((rule) => {
        if (rulesFollowed.includes(rule)) {
          stats[rule].followed++
          if (isWin) stats[rule].winsWhenFollowed++
        } else {
          stats[rule].notFollowed++
          if (isWin) stats[rule].winsWhenNot++
        }
      })
    })

    return Object.entries(stats)
      .map(([rule, data]) => ({
        rule,
        label: ruleLabels[rule] || rule,
        ...data,
        adherenceRate: data.followed + data.notFollowed > 0
          ? (data.followed / (data.followed + data.notFollowed)) * 100
          : 0,
        winRateWhenFollowed: data.followed > 0
          ? (data.winsWhenFollowed / data.followed) * 100
          : 0,
        winRateWhenNot: data.notFollowed > 0
          ? (data.winsWhenNot / data.notFollowed) * 100
          : 0,
      }))
      .sort((a, b) => {
        // Sort by impact (difference in win rate)
        const impactA = a.winRateWhenFollowed - a.winRateWhenNot
        const impactB = b.winRateWhenFollowed - b.winRateWhenNot
        return impactB - impactA
      })
  }, [entries])

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const closedEntries = entries.filter((e) => e.outcome !== null)
    let totalRulesFollowed = 0
    let totalPossibleRules = 0
    let highAdherenceWins = 0
    let highAdherenceTotal = 0
    let lowAdherenceWins = 0
    let lowAdherenceTotal = 0

    closedEntries.forEach((entry) => {
      const rulesFollowed = Array.isArray(entry.rules_followed) ? entry.rules_followed.length : 0
      const totalRules = Object.keys(ruleLabels).length
      const adherencePercent = (rulesFollowed / totalRules) * 100

      totalRulesFollowed += rulesFollowed
      totalPossibleRules += totalRules

      if (adherencePercent >= 75) {
        highAdherenceTotal++
        if (entry.outcome === 'win') highAdherenceWins++
      } else if (adherencePercent < 50) {
        lowAdherenceTotal++
        if (entry.outcome === 'win') lowAdherenceWins++
      }
    })

    return {
      avgAdherence: totalPossibleRules > 0 ? (totalRulesFollowed / totalPossibleRules) * 100 : 0,
      highAdherenceWinRate: highAdherenceTotal > 0 ? (highAdherenceWins / highAdherenceTotal) * 100 : 0,
      lowAdherenceWinRate: lowAdherenceTotal > 0 ? (lowAdherenceWins / lowAdherenceTotal) * 100 : 0,
      highAdherenceTotal,
      lowAdherenceTotal,
    }
  }, [entries])

  if (entries.filter((e) => e.outcome !== null).length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-bold text-lg mb-4">Rule Adherence</h3>
        <p className="text-[var(--muted)] text-center py-8">
          No closed trades to analyze rule adherence.
        </p>
      </div>
    )
  }

  // Find most impactful rule
  const mostImpactfulRule = ruleStats.find((r) => r.followed > 0 && r.notFollowed > 0)

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Rule Adherence Overview</h3>
          <span className="material-symbols-outlined text-[var(--gold)]">checklist</span>
        </div>

        {/* Key Insight */}
        {overallStats.highAdherenceTotal > 0 && overallStats.lowAdherenceTotal > 0 && (
          <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 mb-6">
            <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">
              Key Insight
            </p>
            <p className="text-sm">
              When you follow 75%+ of your rules, your win rate is{' '}
              <span className="font-bold text-[var(--success)]">{overallStats.highAdherenceWinRate.toFixed(0)}%</span>.
              When following less than 50%, it drops to{' '}
              <span className="font-bold text-[var(--danger)]">{overallStats.lowAdherenceWinRate.toFixed(0)}%</span>.
              {overallStats.highAdherenceWinRate > overallStats.lowAdherenceWinRate && (
                <> Discipline pays off!</>
              )}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-black/40 text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
              Avg Adherence
            </p>
            <p className={`text-2xl font-bold mono-num ${overallStats.avgAdherence >= 75 ? 'text-[var(--success)]' : overallStats.avgAdherence >= 50 ? 'text-[var(--gold)]' : 'text-[var(--danger)]'}`}>
              {overallStats.avgAdherence.toFixed(0)}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
              High Discipline WR
            </p>
            <p className="text-2xl font-bold mono-num text-[var(--success)]">
              {overallStats.highAdherenceWinRate.toFixed(0)}%
            </p>
            <p className="text-[10px] text-[var(--muted)]">{overallStats.highAdherenceTotal} trades</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
              Low Discipline WR
            </p>
            <p className="text-2xl font-bold mono-num text-[var(--danger)]">
              {overallStats.lowAdherenceWinRate.toFixed(0)}%
            </p>
            <p className="text-[10px] text-[var(--muted)]">{overallStats.lowAdherenceTotal} trades</p>
          </div>
        </div>
      </div>

      {/* Individual Rules */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-bold text-lg mb-6">Rule-by-Rule Impact</h3>

        <div className="space-y-4">
          {ruleStats.map(({ rule, label, followed, notFollowed, adherenceRate, winRateWhenFollowed, winRateWhenNot }) => {
            const impact = winRateWhenFollowed - winRateWhenNot
            const hasData = followed > 0 || notFollowed > 0

            return (
              <div
                key={rule}
                className="p-4 rounded-xl bg-black/40 border border-[var(--card-border)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{label}</span>
                  <span className={`text-sm font-semibold ${adherenceRate >= 75 ? 'text-[var(--success)]' : adherenceRate >= 50 ? 'text-[var(--gold)]' : 'text-[var(--danger)]'}`}>
                    {adherenceRate.toFixed(0)}% adherence
                  </span>
                </div>

                {hasData && (
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase">When Followed</p>
                      <p className={`font-bold mono-num ${winRateWhenFollowed >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {followed > 0 ? `${winRateWhenFollowed.toFixed(0)}%` : '-'}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">{followed} trades</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase">When Skipped</p>
                      <p className={`font-bold mono-num ${winRateWhenNot >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {notFollowed > 0 ? `${winRateWhenNot.toFixed(0)}%` : '-'}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">{notFollowed} trades</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase">Impact</p>
                      <p className={`font-bold mono-num ${impact >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {followed > 0 && notFollowed > 0 ? `${impact >= 0 ? '+' : ''}${impact.toFixed(0)}%` : '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
