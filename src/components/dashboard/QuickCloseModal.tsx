'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TradeDirection, TradeOutcome } from '@/types/database'

interface QuickCloseModalProps {
  isOpen: boolean
  onClose: () => void
  trade: {
    id: string
    instrument: string
    direction: TradeDirection
    entry_price: number
    stop_loss: number | null
    position_size: number
  }
}

function detectOutcome(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number
): TradeOutcome {
  // Use small threshold for floating point comparison
  const diff = exitPrice - entryPrice
  if (Math.abs(diff) < 0.0001) return 'breakeven'

  if (direction === 'long') {
    return diff > 0 ? 'win' : 'loss'
  } else {
    return diff < 0 ? 'win' : 'loss'
  }
}

export function QuickCloseModal({ isOpen, onClose, trade }: QuickCloseModalProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [exitPrice, setExitPrice] = useState('')
  const [outcome, setOutcome] = useState<TradeOutcome | null>(null)
  const [isOverriding, setIsOverriding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setExitPrice('')
      setOutcome(null)
      setIsOverriding(false)
      setError('')
    }
  }, [isOpen])

  // Auto-detect outcome when exit price changes
  const detectedOutcome = useMemo(() => {
    const exit = parseFloat(exitPrice)
    if (isNaN(exit)) return null
    return detectOutcome(trade.direction, trade.entry_price, exit)
  }, [exitPrice, trade.direction, trade.entry_price])

  // Calculate R-multiple and P&L
  const calculations = useMemo(() => {
    const exit = parseFloat(exitPrice)
    if (isNaN(exit)) return { rMultiple: null, pnl: null }

    let rMultiple: number | null = null
    let pnl: number | null = null

    // R-multiple calculation (if stop loss exists and differs from entry)
    if (trade.stop_loss !== null && Math.abs(trade.stop_loss - trade.entry_price) > 0.0001) {
      const risk = Math.abs(trade.entry_price - trade.stop_loss)
      const reward = trade.direction === 'long'
        ? exit - trade.entry_price
        : trade.entry_price - exit
      rMultiple = parseFloat((reward / risk).toFixed(2))
    }

    // P&L calculation
    const priceDiff = trade.direction === 'long'
      ? exit - trade.entry_price
      : trade.entry_price - exit
    pnl = parseFloat((priceDiff * trade.position_size * 100).toFixed(2))

    return { rMultiple, pnl }
  }, [exitPrice, trade])

  // Update outcome when detected (unless user is overriding)
  useEffect(() => {
    if (detectedOutcome && !isOverriding) {
      setOutcome(detectedOutcome)
    }
  }, [detectedOutcome, isOverriding])

  const handleSubmit = async () => {
    if (!exitPrice) {
      setError('Exit price is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('journal_entries')
        .update({
          exit_price: parseFloat(exitPrice),
          outcome: outcome,
          r_multiple: calculations.rMultiple,
          pnl: calculations.pnl,
          exit_time: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
        })
        .eq('id', trade.id)

      if (updateError) throw updateError

      onClose()
      router.refresh()
    } catch (err) {
      console.error('Error closing trade:', err)
      setError('Failed to close trade. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto glass-floating rounded-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-surface-border)]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              trade.direction === 'long'
                ? 'bg-[var(--success)]/10 text-[var(--success)]'
                : 'bg-[var(--danger)]/10 text-[var(--danger)]'
            }`}>
              <span className="material-symbols-outlined">
                {trade.direction === 'long' ? 'trending_up' : 'trending_down'}
              </span>
            </div>
            <div>
              <h2 className="font-bold">Close {trade.instrument}</h2>
              <p className="text-xs text-[var(--muted)]">
                Entry: {trade.entry_price}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Exit Price */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
              Exit Price *
            </label>
            <input
              type="number"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="w-full input-field rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--gold)] mono-num transition-colors"
              placeholder="0.00"
              step="any"
              autoFocus
            />
          </div>

          {/* Auto-detected outcome */}
          {detectedOutcome && (
            <div className="p-3 rounded-xl glass-surface">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                  Detected Outcome
                </span>
                <button
                  onClick={() => setIsOverriding(!isOverriding)}
                  className="text-[10px] text-[var(--gold)] hover:underline"
                >
                  {isOverriding ? 'Use detected' : 'Override'}
                </button>
              </div>

              {!isOverriding ? (
                <div className={`text-lg font-bold capitalize ${
                  detectedOutcome === 'win' ? 'text-[var(--success)]' :
                  detectedOutcome === 'loss' ? 'text-[var(--danger)]' :
                  'text-[var(--warning)]'
                }`}>
                  {detectedOutcome}
                </div>
              ) : (
                <div className="flex gap-2">
                  {(['win', 'loss', 'breakeven'] as TradeOutcome[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => setOutcome(o)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        outcome === o
                          ? o === 'win' ? 'bg-[var(--success)] text-white' :
                            o === 'loss' ? 'bg-[var(--danger)] text-white' :
                            'bg-[var(--warning)] text-black'
                          : 'bg-black/5 hover:bg-black/[0.06]'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calculated metrics */}
          {(calculations.rMultiple !== null || calculations.pnl !== null) && (
            <div className="grid grid-cols-2 gap-3">
              {calculations.rMultiple !== null && (
                <div className="p-3 rounded-xl glass-surface">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">R-Multiple</p>
                  <p className={`text-lg font-bold mono-num ${
                    calculations.rMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {calculations.rMultiple >= 0 ? '+' : ''}{calculations.rMultiple}R
                  </p>
                </div>
              )}
              {calculations.pnl !== null && (
                <div className="p-3 rounded-xl glass-surface">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Est. P&L</p>
                  <p className={`text-lg font-bold mono-num ${
                    calculations.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {calculations.pnl >= 0 ? '+' : ''}${calculations.pnl}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--glass-surface-border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl btn-glass font-semibold hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !exitPrice}
            className="flex-1 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              'Close Trade'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
