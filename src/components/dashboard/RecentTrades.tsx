'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SkeletonTradeItem } from '@/components/ui/Skeleton'
import type { TradeDirection, TradeOutcome } from '@/types/database'

interface RecentTrade {
  id: string
  instrument: string
  direction: TradeDirection
  outcome: TradeOutcome | null
  trade_date: string
  r_multiple: number | null
  entry_price: number
  stop_loss: number | null
  position_size: number
}

export function RecentTrades() {
  const { profile, isLoading: authLoading } = useAuth()
  const [trades, setTrades] = useState<RecentTrade[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadTrades = async () => {
      if (!profile?.id) return

      setIsFetching(true)
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('id, instrument, direction, outcome, trade_date, r_multiple, entry_price, stop_loss, position_size')
          .eq('user_id', profile.id)
          .order('trade_date', { ascending: false })
          .limit(10)

        if (error) throw error
        setTrades(data || [])
      } catch (error) {
        console.error('Error loading trades:', error)
      } finally {
        setIsFetching(false)
      }
    }

    // Only fetch when auth is done and we have a profile
    if (!authLoading && profile?.id) {
      loadTrades()
    }
  }, [profile?.id, authLoading, supabase])

  const isLoading = authLoading || isFetching

  const getOutcomeIcon = (outcome: string | null) => {
    switch (outcome) {
      case 'win':
        return { icon: 'check_circle', color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' }
      case 'loss':
        return { icon: 'cancel', color: 'text-[var(--danger)]', bg: 'bg-[var(--danger)]/10' }
      case 'breakeven':
        return { icon: 'remove_circle', color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10' }
      default:
        return { icon: 'pending', color: 'text-[var(--muted)]', bg: 'bg-black/5' }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonTradeItem key={i} />
        ))}
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="p-8 rounded-xl glass-surface text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl text-[var(--gold)]">history</span>
        </div>
        <p className="text-sm font-medium mb-1">No trades yet</p>
        <p className="text-xs text-[var(--muted)] mb-3">Start journaling to see your history</p>
        <Link
          href="/journal/new"
          className="text-xs text-[var(--gold)] hover:underline"
        >
          Log your first trade
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
          Recent Trades
        </h3>
        <Link
          href="/journal"
          className="text-[10px] text-[var(--gold)] hover:underline uppercase tracking-wider"
        >
          View All
        </Link>
      </div>

      {/* Trades List */}
      <div className="space-y-2">
        {trades.map((trade) => {
          const outcome = getOutcomeIcon(trade.outcome)

          return (
            <Link
              key={trade.id}
              href={`/journal/${trade.id}`}
              className="block p-3 rounded-xl glass-surface hover:border-[var(--gold)]/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                {/* Outcome Icon */}
                <div className={`w-8 h-8 rounded-lg ${outcome.bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined text-lg ${outcome.color}`}>
                    {outcome.icon}
                  </span>
                </div>

                {/* Trade Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{trade.instrument}</span>
                    <span className={`text-[10px] font-semibold uppercase ${
                      trade.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {trade.direction}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)]">
                    {formatDate(trade.trade_date)}
                  </span>
                </div>

                {/* R Multiple or Outcome with Close Button */}
                <div className="text-right flex items-center gap-2">
                  {/* Close button for open trades — navigates to detail page */}
                  {trade.outcome === null && (
                    <Link
                      href={`/journal/${trade.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center hover:bg-[var(--gold)]/20 transition-colors"
                      title="Close trade"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                    </Link>
                  )}
                  {trade.r_multiple !== null ? (
                    <span className={`mono-num text-sm font-bold ${
                      trade.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {trade.r_multiple >= 0 ? '+' : ''}{trade.r_multiple}R
                    </span>
                  ) : (
                    <span className={`text-xs font-semibold uppercase ${outcome.color}`}>
                      {trade.outcome || 'Open'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats */}
      {trades.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--glass-surface-border)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[var(--success)]">check_circle</span>
              <span className="text-xs font-bold">{trades.filter(t => t.outcome === 'win').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[var(--danger)]">cancel</span>
              <span className="text-xs font-bold">{trades.filter(t => t.outcome === 'loss').length}</span>
            </div>
          </div>
          <span className="text-[10px] text-[var(--muted)]">Last {trades.length} trades</span>
        </div>
      )}

    </div>
  )
}
