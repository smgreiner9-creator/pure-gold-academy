'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { EmotionType, OnboardingState } from '@/types/database'

const instruments = [
  { value: 'XAUUSD', label: 'XAUUSD' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'BTC/USD' },
]

const emotions = [
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'confident', emoji: '💪', label: 'Confident' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'fearful', emoji: '😨', label: 'Fearful' },
  { value: 'greedy', emoji: '🤑', label: 'Greedy' },
  { value: 'frustrated', emoji: '😤', label: 'Frustrated' },
]

interface QuickEntryBarProps {
  onEntryCreated?: () => void
}

export function QuickEntryBar({ onEntryCreated }: QuickEntryBarProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [instrument, setInstrument] = useState('XAUUSD')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entryPrice, setEntryPrice] = useState('')
  const [emotion, setEmotion] = useState<string>('')
  const [stopLoss, setStopLoss] = useState('')
  const [showStopLoss, setShowStopLoss] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!profile?.id || !entryPrice || !emotion || isSubmitting) return

    setError('')
    setIsSubmitting(true)
    try {
      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: profile.id,
          classroom_id: profile.classroom_id || null,
          instrument,
          direction,
          entry_price: parseFloat(entryPrice),
          position_size: 0.01,
          emotion_before: emotion as EmotionType,
          trade_date: new Date().toISOString().split('T')[0],
          rules_followed: [] as string[],
          screenshot_urls: [] as string[],
          ...(stopLoss ? { stop_loss: parseFloat(stopLoss) } : {}),
        })

      if (insertError) {
        console.error('Quick entry error:', insertError)
        throw new Error(insertError.message)
      }

      // Increment trades_logged in onboarding_state
      try {
        const onboarding = (profile.onboarding_state as unknown as OnboardingState) ?? { trades_logged: 0 }
        await supabase
          .from('profiles')
          .update({
            onboarding_state: {
              ...onboarding,
              trades_logged: (onboarding.trades_logged ?? 0) + 1,
              first_trade_at: onboarding.first_trade_at ?? new Date().toISOString(),
            },
          })
          .eq('user_id', profile.user_id)
      } catch (e) {
        console.error('Failed to update trades_logged:', e)
      }

      setEntryPrice('')
      setEmotion('')
      setStopLoss('')
      setShowStopLoss(false)
      onEntryCreated?.()
    } catch (err) {
      console.error('Quick entry failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Instrument */}
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          aria-label="Instrument"
          className="input-field rounded-xl px-3 py-2.5 text-sm font-semibold appearance-none cursor-pointer"
        >
          {instruments.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>

        {/* Direction Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--glass-surface-border)]">
          <button
            type="button"
            onClick={() => setDirection('long')}
            className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              direction === 'long'
                ? 'bg-[var(--success)] text-white'
                : 'bg-black/[0.03] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Long
          </button>
          <button
            type="button"
            onClick={() => setDirection('short')}
            className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              direction === 'short'
                ? 'bg-[var(--danger)] text-white'
                : 'bg-black/[0.03] text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Short
          </button>
        </div>

        {/* Entry Price */}
        <input
          type="number"
          step="any"
          value={entryPrice}
          onChange={(e) => setEntryPrice(e.target.value)}
          placeholder="Entry price"
          aria-label="Entry price"
          aria-required="true"
          className="input-field flex-1 min-w-[120px] rounded-xl px-3 py-2.5 text-sm mono-num"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
        />

        {/* Log Button */}
        <button
          onClick={handleSubmit}
          disabled={!entryPrice || !emotion || isSubmitting}
          className="btn-gold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">add</span>
          )}
          Log
        </button>
      </div>

      {/* Second Row: Emotion Picker & Stop Loss */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {/* Emotion Picker */}
        <div className="flex items-center gap-2">
          {emotions.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEmotion(e.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                emotion === e.value
                  ? 'bg-[var(--gold)] text-white border-[var(--gold)] shadow-sm'
                  : 'bg-black/[0.03] text-[var(--muted)] border-transparent hover:text-[var(--foreground)] hover:border-[var(--glass-surface-border)]'
              }`}
              title={e.label}
            >
              <span className="text-sm">{e.emoji}</span>
              <span className="hidden sm:inline">{e.label}</span>
            </button>
          ))}
        </div>

        {/* Stop Loss */}
        <div className="flex items-center gap-2">
          {!showStopLoss ? (
            <button
              type="button"
              onClick={() => setShowStopLoss(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-black/[0.03] text-[var(--muted)] hover:text-[var(--foreground)] border border-transparent hover:border-[var(--glass-surface-border)] transition-all"
              title="Add stop loss"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>SL</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Stop loss"
                aria-label="Stop loss"
                className="input-field w-28 rounded-xl px-3 py-1.5 text-xs mono-num"
              />
              <button
                type="button"
                onClick={() => {
                  setShowStopLoss(false)
                  setStopLoss('')
                }}
                className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                title="Remove stop loss"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>
      )}

      {/* Full entry link */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[10px] text-[var(--muted)]">Quick log — add details after</p>
        <button
          onClick={() => router.push('/journal/new')}
          className="text-[10px] text-[var(--gold)] hover:underline"
        >
          Full entry form
        </button>
      </div>
    </div>
  )
}
