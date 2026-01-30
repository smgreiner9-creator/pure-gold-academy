'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { TradeDirection, EmotionType } from '@/types/database'

interface QuickTradeEntryProps {
  isOpen: boolean
  onClose: () => void
}

const instruments = [
  'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'US30', 'NAS100'
]

const emotions: { value: EmotionType; label: string }[] = [
  { value: 'calm', label: '😌 Calm' },
  { value: 'confident', label: '💪 Confident' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'anxious', label: '😰 Anxious' },
]

export function QuickTradeEntry({ isOpen, onClose }: QuickTradeEntryProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [instrument, setInstrument] = useState('XAUUSD')
  const [direction, setDirection] = useState<TradeDirection>('long')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [positionSize, setPositionSize] = useState('0.01')
  const [emotion, setEmotion] = useState<EmotionType>('neutral')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const lotSizePresets = ['0.01', '0.05', '0.1', '0.5', '1.0']

  const handleSubmit = async () => {
    if (!profile?.id) return
    if (!entryPrice) {
      setError('Entry price is required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: profile.id,
          classroom_id: profile.classroom_id,
          instrument,
          direction,
          entry_price: parseFloat(entryPrice),
          stop_loss: stopLoss ? parseFloat(stopLoss) : null,
          position_size: parseFloat(positionSize) || 0.01,
          emotion_before: emotion,
          trade_date: new Date().toISOString().split('T')[0],
          entry_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          rules_followed: [],
          screenshot_urls: [],
        })

      if (insertError) throw insertError

      // Reset form
      setInstrument('XAUUSD')
      setDirection('long')
      setEntryPrice('')
      setStopLoss('')
      setPositionSize('0.01')
      setEmotion('neutral')
      onClose()

      // Refresh to show new entry
      router.refresh()
    } catch (err) {
      console.error('Error creating entry:', err)
      setError('Failed to create entry. Please try again.')
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
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto glass-floating rounded-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-surface-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <h2 className="font-bold">Quick Trade Entry</h2>
              <p className="text-xs text-[var(--muted)]">Log a trade in seconds</p>
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
          {/* Instrument */}
          <div className="flex flex-wrap gap-2">
            {instruments.map((inst) => (
              <button
                key={inst}
                onClick={() => setInstrument(inst)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  instrument === inst
                    ? 'bg-[var(--gold)] text-black'
                    : 'bg-black/5 hover:bg-black/[0.06]'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>

          {/* Direction */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection('long')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${
                direction === 'long'
                  ? 'bg-[var(--success)] text-white'
                  : 'bg-black/5 hover:bg-black/[0.06]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">trending_up</span>
              Long
            </button>
            <button
              onClick={() => setDirection('short')}
              className={`p-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${
                direction === 'short'
                  ? 'bg-[var(--danger)] text-white'
                  : 'bg-black/5 hover:bg-black/[0.06]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">trending_down</span>
              Short
            </button>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
                Entry Price *
              </label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full input-field rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--gold)] mono-num transition-colors"
                placeholder="0.00"
                step="any"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
                Stop Loss
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full input-field rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--gold)] mono-num transition-colors"
                placeholder="Optional"
                step="any"
              />
            </div>
          </div>

          {/* Position Size */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
              Lot Size
            </label>
            <div className="flex gap-2">
              {lotSizePresets.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPositionSize(size)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    positionSize === size
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-black/5 hover:bg-black/[0.06]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
              How are you feeling?
            </label>
            <div className="flex gap-2">
              {emotions.map((em) => (
                <button
                  key={em.value}
                  onClick={() => setEmotion(em.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    emotion === em.value
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-black/5 hover:bg-black/[0.06]'
                  }`}
                >
                  {em.label}
                </button>
              ))}
            </div>
          </div>

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
            disabled={isSubmitting || !entryPrice}
            className="flex-1 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            ) : (
              'Log Trade'
            )}
          </button>
        </div>

        {/* Keyboard hint and full form link */}
        <div className="px-4 pb-3 text-center space-y-2">
          <p className="text-[10px] text-[var(--muted)]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] font-mono">Q</kbd> to open Quick Trade anytime
          </p>
          <button
            onClick={() => {
              onClose()
              router.push('/journal/new')
            }}
            className="text-[10px] text-[var(--gold)] hover:underline"
          >
            Need more details? Use full form
          </button>
        </div>
      </div>
    </>
  )
}
