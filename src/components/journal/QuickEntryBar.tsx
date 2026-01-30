'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const instruments = [
  { value: 'XAUUSD', label: 'XAUUSD' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'BTC/USD' },
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!profile?.id || !entryPrice || isSubmitting) return

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
          emotion_before: 'neutral',
          trade_date: new Date().toISOString().split('T')[0],
          rules_followed: [],
          screenshot_urls: [],
        })

      if (insertError) {
        console.error('Quick entry error:', insertError)
        throw new Error(insertError.message)
      }

      setEntryPrice('')
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
          disabled={!entryPrice || isSubmitting}
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
