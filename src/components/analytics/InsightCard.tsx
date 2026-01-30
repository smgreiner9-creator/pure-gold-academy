'use client'

import Link from 'next/link'
import type { Insight, InsightSeverity } from './InsightEngine'

interface LinkedContent {
  id: string
  title: string
}

const severityStyles: Record<InsightSeverity, { bg: string; border: string; text: string; iconBg: string }> = {
  danger: {
    bg: 'bg-[var(--danger)]/5',
    border: 'border-[var(--danger)]/20',
    text: 'text-[var(--danger)]',
    iconBg: 'bg-[var(--danger)]/10',
  },
  warning: {
    bg: 'bg-[var(--warning)]/5',
    border: 'border-[var(--warning)]/20',
    text: 'text-[var(--warning)]',
    iconBg: 'bg-[var(--warning)]/10',
  },
  info: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  success: {
    bg: 'bg-[var(--success)]/5',
    border: 'border-[var(--success)]/20',
    text: 'text-[var(--success)]',
    iconBg: 'bg-[var(--success)]/10',
  },
}

interface InsightCardProps {
  insight: Insight
  compact?: boolean
  linkedContent?: LinkedContent | null
}

export function InsightCard({ insight, compact = false, linkedContent }: InsightCardProps) {
  const style = severityStyles[insight.severity]

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${style.border} ${style.bg}`}>
        <span className={`material-symbols-outlined text-lg ${style.text}`}>
          {insight.icon}
        </span>
        <p className="text-xs font-medium flex-1">{insight.message}</p>
        {insight.stat && (
          <span className={`text-xs font-bold ${style.text} shrink-0`}>{insight.stat}</span>
        )}
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-2xl border ${style.border} ${style.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined text-xl ${style.text}`}>
            {insight.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold">{insight.title}</h4>
            {insight.stat && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.iconBg} ${style.text}`}>
                {insight.stat}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--muted)] leading-relaxed">{insight.message}</p>
          {linkedContent && (
            <Link
              href={`/learn/${linkedContent.id}`}
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-[var(--gold)] hover:underline"
            >
              <span className="material-symbols-outlined text-sm">school</span>
              Learn: {linkedContent.title}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
