'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface RecentEntry {
  id: string
  outcome: string | null
  instrument: string
  direction: string
  trade_date: string
  r_multiple: number | null
}

interface PreviousTradeCardProps {
  refreshKey?: number
}

export function PreviousTradeCard({ refreshKey }: PreviousTradeCardProps) {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<RecentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadLatest = useCallback(async () => {
    if (!profile?.id) return
    setIsLoading(true)

    const { data } = await supabase
      .from('journal_entries')
      .select('id, outcome, instrument, direction, trade_date, r_multiple')
      .eq('user_id', profile.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    setEntries(data || [])
    setIsLoading(false)
  }, [profile?.id, supabase])

  useEffect(() => {
    loadLatest()
  }, [loadLatest, refreshKey])

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'win': return 'text-[var(--success)] bg-[var(--success)]/10'
      case 'loss': return 'text-[var(--danger)] bg-[var(--danger)]/10'
      case 'breakeven': return 'text-[var(--warning)] bg-[var(--warning)]/10'
      default: return 'text-[var(--muted)] bg-black/5'
    }
  }

  if (isLoading) {
    return (
      <div className="glass-surface p-5 space-y-3">
        <div className="h-4 w-28 bg-black/5 rounded animate-pulse" />
        <div className="h-12 bg-black/5 rounded animate-pulse" />
        <div className="h-12 bg-black/5 rounded animate-pulse" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="glass-surface p-5 text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-[var(--gold)]">candlestick_chart</span>
        </div>
        <p className="text-sm font-semibold mb-1">No trades yet</p>
        <Link
          href="/journal/new"
          className="text-xs text-[var(--gold)] font-medium hover:underline"
        >
          Log your first trade
        </Link>
      </div>
    )
  }

  return (
    <div className="glass-surface p-5">
      <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Recent Trades</h3>

      <div className="space-y-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.outcome ? `/journal/${entry.id}` : `/journal/${entry.id}/edit`}
            className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--glass-surface-border)] hover:border-[var(--gold)]/30 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${getOutcomeColor(entry.outcome)}`}>
                {entry.outcome || 'Open'}
              </span>
              <span className="text-sm font-bold truncate">{entry.instrument}</span>
              <span className={`text-xs font-semibold shrink-0 ${
                entry.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
              }`}>
                {entry.direction.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-[10px] text-[var(--muted)]">
                {new Date(entry.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {entry.r_multiple !== null && (
                <span className={`mono-num text-xs font-bold ${
                  entry.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}>
                  {entry.r_multiple >= 0 ? '+' : ''}{entry.r_multiple.toFixed(1)}R
                </span>
              )}
              <span className="material-symbols-outlined text-[var(--muted)] text-sm">chevron_right</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
