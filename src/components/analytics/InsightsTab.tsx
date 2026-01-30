'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { JournalEntry } from '@/types/database'
import { generateInsights } from './InsightEngine'
import { InsightCard } from './InsightCard'

interface InsightsTabProps {
  entries: JournalEntry[]
}

export function InsightsTab({ entries }: InsightsTabProps) {
  const insights = useMemo(() => generateInsights(entries), [entries])

  if (entries.length < 5) {
    return (
      <div className="glass-elevated p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--gold)]">lightbulb</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Not Enough Data</h2>
        <p className="text-[var(--muted)] mb-6">
          Log at least 5 trades to start seeing personalized insights.
        </p>
        <Link
          href="/journal/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined">add</span>
          Log a Trade
        </Link>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="glass-elevated p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Looking Good</h2>
        <p className="text-[var(--muted)]">
          No significant patterns detected yet. Keep trading and logging — insights will appear as your data grows.
        </p>
      </div>
    )
  }

  const dangerInsights = insights.filter((i) => i.severity === 'danger')
  const warningInsights = insights.filter((i) => i.severity === 'warning')
  const successInsights = insights.filter((i) => i.severity === 'success')
  const infoInsights = insights.filter((i) => i.severity === 'info')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Trading Insights</h2>
          <p className="text-sm text-[var(--muted)]">
            {insights.length} insight{insights.length !== 1 ? 's' : ''} based on {entries.length} trades
          </p>
        </div>
      </div>

      {/* Critical issues first */}
      {dangerInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[var(--danger)] uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">error</span>
            Needs Attention
          </h3>
          {dangerInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Warnings */}
      {warningInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[var(--warning)] uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">warning</span>
            Watch Out
          </h3>
          {warningInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Strengths */}
      {successInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[var(--success)] uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">thumb_up</span>
            Strengths
          </h3>
          {successInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Info */}
      {infoInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">info</span>
            Notes
          </h3>
          {infoInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  )
}
