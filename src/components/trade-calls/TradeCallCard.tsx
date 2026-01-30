'use client'

import { useState } from 'react'
import { Card, Button } from '@/components/ui'
import { TradeCall, TradeCallStatus } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

interface TradeCallCardProps {
  tradeCall: TradeCall & { teacher?: { display_name: string | null } }
  onCopyToJournal?: (tradeCall: TradeCall) => void
  onClose?: (id: string) => void
  isTeacher?: boolean
  showActions?: boolean
}

const statusConfig: Record<TradeCallStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Active', color: 'bg-[var(--gold)]/20 text-[var(--gold)]', icon: <span className="material-symbols-outlined text-sm">target</span> },
  hit_tp1: { label: 'TP1 Hit', color: 'bg-[var(--success)]/20 text-[var(--success)]', icon: <span className="material-symbols-outlined text-sm">check_circle</span> },
  hit_tp2: { label: 'TP2 Hit', color: 'bg-[var(--success)]/20 text-[var(--success)]', icon: <span className="material-symbols-outlined text-sm">check_circle</span> },
  hit_tp3: { label: 'TP3 Hit', color: 'bg-[var(--success)]/20 text-[var(--success)]', icon: <span className="material-symbols-outlined text-sm">check_circle</span> },
  hit_sl: { label: 'SL Hit', color: 'bg-[var(--danger)]/20 text-[var(--danger)]', icon: <span className="material-symbols-outlined text-sm">cancel</span> },
  manual_close: { label: 'Closed', color: 'bg-[var(--muted)]/20 text-[var(--muted)]', icon: <span className="material-symbols-outlined text-sm">check_circle</span> },
  cancelled: { label: 'Cancelled', color: 'bg-[var(--muted)]/20 text-[var(--muted)]', icon: <span className="material-symbols-outlined text-sm">cancel</span> },
}

export function TradeCallCard({
  tradeCall,
  onCopyToJournal,
  onClose,
  isTeacher = false,
  showActions = true
}: TradeCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  const status = statusConfig[tradeCall.status]
  const isLong = tradeCall.direction === 'long'
  const directionColor = isLong ? 'text-[var(--success)]' : 'text-[var(--danger)]'
  const directionBg = isLong ? 'bg-[var(--success)]/10' : 'bg-[var(--danger)]/10'

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })
  }

  const calculateRiskPips = () => {
    if (!tradeCall.entry_price || !tradeCall.stop_loss) return null
    const diff = Math.abs(tradeCall.entry_price - tradeCall.stop_loss)
    return diff
  }

  const riskPips = calculateRiskPips()

  return (
    <Card className="relative overflow-hidden">
      {/* Direction indicator strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLong ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${directionBg}`}>
              {isLong ? <span className={`material-symbols-outlined text-base ${directionColor}`}>trending_up</span> : <span className={`material-symbols-outlined text-base ${directionColor}`}>trending_down</span>}
              <span className={`text-sm font-semibold ${directionColor}`}>
                {tradeCall.direction.toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg">{tradeCall.instrument}</h3>
              {tradeCall.timeframe && (
                <span className="text-xs text-[var(--muted)]">{tradeCall.timeframe}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
        </div>

        {/* Price levels */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <p className="text-xs text-[var(--muted)] mb-0.5">Entry</p>
            <p className="font-mono font-semibold">{formatPrice(tradeCall.entry_price)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] mb-0.5">Stop Loss</p>
            <p className="font-mono font-semibold text-[var(--danger)]">{formatPrice(tradeCall.stop_loss)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] mb-0.5">TP1</p>
            <p className="font-mono font-semibold text-[var(--success)]">{formatPrice(tradeCall.take_profit_1)}</p>
          </div>
          {tradeCall.risk_reward_ratio && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-0.5">R:R</p>
              <p className="font-mono font-semibold text-[var(--gold)]">1:{tradeCall.risk_reward_ratio.toFixed(1)}</p>
            </div>
          )}
        </div>

        {/* Expandable content */}
        {(tradeCall.take_profit_2 || tradeCall.take_profit_3 || tradeCall.analysis_text || tradeCall.chart_url) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-2"
          >
            {expanded ? <span className="material-symbols-outlined text-base">expand_less</span> : <span className="material-symbols-outlined text-base">expand_more</span>}
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {expanded && (
          <div className="space-y-3 border-t border-[var(--glass-surface-border)] pt-3">
            {/* Additional TPs */}
            {(tradeCall.take_profit_2 || tradeCall.take_profit_3) && (
              <div className="flex gap-4">
                {tradeCall.take_profit_2 && (
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-0.5">TP2</p>
                    <p className="font-mono font-semibold text-[var(--success)]">{formatPrice(tradeCall.take_profit_2)}</p>
                  </div>
                )}
                {tradeCall.take_profit_3 && (
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-0.5">TP3</p>
                    <p className="font-mono font-semibold text-[var(--success)]">{formatPrice(tradeCall.take_profit_3)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Analysis */}
            {tradeCall.analysis_text && (
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Analysis</p>
                <p className="text-sm whitespace-pre-wrap">{tradeCall.analysis_text}</p>
              </div>
            )}

            {/* Chart link */}
            {tradeCall.chart_url && (
              <a
                href={tradeCall.chart_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-[var(--gold)] hover:underline"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                View Chart
              </a>
            )}

            {/* Result (if closed) */}
            {tradeCall.status !== 'active' && tradeCall.status !== 'cancelled' && (
              <div className="glass-surface rounded p-3">
                <p className="text-xs text-[var(--muted)] mb-1">Result</p>
                <div className="flex items-center gap-4">
                  {tradeCall.actual_exit_price && (
                    <div>
                      <p className="text-xs text-[var(--muted)]">Exit Price</p>
                      <p className="font-mono">{formatPrice(tradeCall.actual_exit_price)}</p>
                    </div>
                  )}
                  {tradeCall.result_pips !== null && (
                    <div>
                      <p className="text-xs text-[var(--muted)]">Pips</p>
                      <p className={`font-mono font-semibold ${tradeCall.result_pips >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {tradeCall.result_pips >= 0 ? '+' : ''}{tradeCall.result_pips.toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
                {tradeCall.close_notes && (
                  <p className="text-sm text-[var(--muted)] mt-2">{tradeCall.close_notes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--glass-surface-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="material-symbols-outlined text-xs">schedule</span>
            {formatDistanceToNow(new Date(tradeCall.published_at), { addSuffix: true })}
            {tradeCall.teacher?.display_name && (
              <>
                <span>by</span>
                <span className="text-[var(--foreground)]">{tradeCall.teacher.display_name}</span>
              </>
            )}
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              {!isTeacher && onCopyToJournal && tradeCall.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopyToJournal(tradeCall)}
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy to Journal
                </Button>
              )}
              {isTeacher && onClose && tradeCall.status === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClose(tradeCall.id)}
                >
                  Close Trade
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
