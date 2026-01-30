'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface PostTradeReflectionProps {
  entryId: string
  instrument: string
  rMultiple: number | null
  avgR: number | null
  onContinue: () => void
}

export function PostTradeReflection({
  entryId,
  instrument,
  rMultiple,
  avgR,
  onContinue,
}: PostTradeReflectionProps) {
  const [reflection, setReflection] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleBlur = async () => {
    if (!reflection.trim()) return

    setSaving(true)
    setSaved(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('journal_entries')
      .update({ reflection_notes: reflection.trim() })
      .eq('id', entryId)

    setSaving(false)
    if (!error) {
      setSaved(true)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setSaved(false), 2000)
    }
  }

  const rComparison = rMultiple !== null && avgR !== null
  const aboveAverage = rComparison && rMultiple! > avgR!
  const belowAverage = rComparison && rMultiple! < avgR!

  const formatR = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}R`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-surface border-l-4 border-[var(--gold)] rounded-xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined text-[var(--gold)]"
          style={{ fontSize: 24 }}
        >
          psychology
        </span>
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Post-Trade Reflection
          </h3>
          <p className="text-sm text-[var(--muted)]">
            {instrument} trade logged successfully
          </p>
        </div>
      </div>

      {/* Section 1: Reflection textarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--foreground)]">
          What would you do differently?
        </label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          onBlur={handleBlur}
          placeholder="Nothing is too small — even 'I'd wait for confirmation' counts"
          rows={3}
          className="input-field w-full resize-none"
        />
        <div className="h-4 flex items-center">
          {saving && (
            <span className="text-xs text-[var(--muted)]">Saving...</span>
          )}
          {saved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[var(--success)] flex items-center gap-1"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                check_circle
              </span>
              Saved
            </motion.span>
          )}
        </div>
      </div>

      {/* Section 2: R-multiple comparison */}
      {rComparison && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">
            This trade vs your average
          </label>
          <div className="flex items-center gap-4 rounded-lg bg-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">This trade:</span>
              <span
                className={`mono-num text-sm font-semibold ${
                  rMultiple! >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {formatR(rMultiple!)}
              </span>
            </div>
            <div className="w-px h-5 bg-[var(--glass-surface-border)]" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">Your avg:</span>
              <span
                className={`mono-num text-sm font-semibold ${
                  avgR! >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {formatR(avgR!)}
              </span>
            </div>
          </div>

          {aboveAverage && (
            <p className="text-sm text-[var(--success)] flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                trending_up
              </span>
              Above average — what made this trade work?
            </p>
          )}
          {belowAverage && (
            <p className="text-sm text-[var(--warning)] flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                trending_down
              </span>
              Below average — review your entry criteria
            </p>
          )}
          {!aboveAverage && !belowAverage && (
            <p className="text-sm text-[var(--muted)] flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                trending_flat
              </span>
              Right at your average — consistency is key
            </p>
          )}
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="btn-gold w-full flex items-center justify-center gap-2"
      >
        <span>Continue to Journal</span>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          arrow_forward
        </span>
      </button>
    </motion.div>
  )
}
