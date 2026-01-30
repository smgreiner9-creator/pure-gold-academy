'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { EmotionType, SetupType, TradeDirection, TradeOutcome } from '@/types/database'

interface ImportReflectionSwiperProps {
  entryIds: string[]
  onComplete: () => void
}

interface JournalEntry {
  id: string
  instrument: string
  direction: TradeDirection
  entry_price: number
  exit_price: number | null
  pnl: number | null
  outcome: TradeOutcome | null
  trade_date: string
}

const EMOTIONS: { value: EmotionType; label: string; icon: string }[] = [
  { value: 'calm', label: 'Calm', icon: '\u{1F60C}' },
  { value: 'confident', label: 'Confident', icon: '\u{1F4AA}' },
  { value: 'neutral', label: 'Neutral', icon: '\u{1F610}' },
  { value: 'anxious', label: 'Anxious', icon: '\u{1F630}' },
  { value: 'fearful', label: 'Fearful', icon: '\u{1F628}' },
  { value: 'greedy', label: 'Greedy', icon: '\u{1F911}' },
  { value: 'frustrated', label: 'Frustrated', icon: '\u{1F624}' },
]

const SETUP_TYPES: { value: SetupType; label: string; icon: string }[] = [
  { value: 'breakout', label: 'Breakout', icon: 'north_east' },
  { value: 'pullback', label: 'Pullback', icon: 'south_west' },
  { value: 'reversal', label: 'Reversal', icon: 'swap_vert' },
  { value: 'range', label: 'Range', icon: 'width' },
  { value: 'trend_continuation', label: 'Trend', icon: 'trending_up' },
  { value: 'news', label: 'News', icon: 'newspaper' },
  { value: 'custom', label: 'Custom', icon: 'edit' },
]

export function ImportReflectionSwiper({ entryIds, onComplete }: ImportReflectionSwiperProps) {
  const supabase = useMemo(() => createClient(), [])

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0) // -1 = left, 1 = right for animation
  const [isDone, setIsDone] = useState(false)
  const [reflectedCount, setReflectedCount] = useState(0)

  // Per-card state
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null)
  const [selectedSetup, setSelectedSetup] = useState<SetupType | null>(null)
  const [executionRating, setExecutionRating] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch entries
  useEffect(() => {
    async function fetchEntries() {
      if (entryIds.length === 0) {
        setIsLoading(false)
        setIsDone(true)
        return
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .select('id, instrument, direction, entry_price, exit_price, pnl, outcome, trade_date')
        .in('id', entryIds)
        .order('trade_date', { ascending: true })

      if (error) {
        console.error('Error fetching entries:', error)
      } else if (data) {
        setEntries(data)
      }

      setIsLoading(false)
    }

    fetchEntries()
  }, [entryIds, supabase])

  const currentEntry = entries[currentIndex] || null
  const isLast = currentIndex >= entries.length - 1

  const resetCardState = useCallback(() => {
    setSelectedEmotion(null)
    setSelectedSetup(null)
    setExecutionRating(0)
  }, [])

  const goToNext = useCallback(() => {
    if (isLast) {
      setIsDone(true)
    } else {
      setDirection(1)
      setCurrentIndex(prev => prev + 1)
      resetCardState()
    }
  }, [isLast, resetCardState])

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex(prev => prev - 1)
      resetCardState()
    }
  }, [currentIndex, resetCardState])

  const handleSkip = useCallback(() => {
    goToNext()
  }, [goToNext])

  const handleSave = useCallback(async () => {
    if (!currentEntry) return

    setIsSaving(true)

    const updates: Record<string, unknown> = {}
    if (selectedEmotion) updates.emotion_before = selectedEmotion
    if (selectedSetup) updates.setup_type = selectedSetup
    if (executionRating > 0) updates.execution_rating = executionRating

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', currentEntry.id)

      if (error) {
        console.error('Error updating entry:', error)
      } else {
        setReflectedCount(prev => prev + 1)
      }
    }

    setIsSaving(false)
    goToNext()
  }, [currentEntry, selectedEmotion, selectedSetup, executionRating, supabase, goToNext])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isDone) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleSkip()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDone, goToPrev, handleSkip, handleSave])

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.span
          className="material-symbols-outlined text-4xl text-[var(--gold)]"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        >
          sync
        </motion.span>
      </div>
    )
  }

  // Done state
  if (isDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-elevated rounded-2xl p-10 text-center space-y-5 max-w-lg mx-auto"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--success)]/15">
          <span className="material-symbols-outlined text-4xl text-[var(--success)]">
            check_circle
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-bold">All done!</h2>
          <p className="text-[var(--muted)] mt-1">
            You reflected on <span className="text-[var(--foreground)] font-semibold">{reflectedCount}</span>{' '}
            trade{reflectedCount !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={onComplete}
          className="btn-gold px-8 py-3 rounded-xl font-bold text-sm"
        >
          Continue to Journal
        </button>
      </motion.div>
    )
  }

  if (!currentEntry) return null

  const pnlValue = currentEntry.pnl ?? 0
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          Trade <span className="text-[var(--foreground)] font-semibold">{currentIndex + 1}</span> of{' '}
          <span className="text-[var(--foreground)] font-semibold">{entries.length}</span>
        </p>

        <div className="flex gap-1">
          {entries.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-6 gold-gradient'
                  : i < currentIndex
                    ? 'w-1.5 bg-[var(--gold)]/40'
                    : 'w-1.5 bg-[var(--glass-surface-border)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="relative overflow-hidden" style={{ minHeight: 520 }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentEntry.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass-elevated rounded-2xl p-6 space-y-6"
          >
            {/* Trade Details */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-xl
                  ${currentEntry.direction === 'long' ? 'bg-[var(--success)]/15' : 'bg-[var(--danger)]/15'}
                `}>
                  <span className={`material-symbols-outlined text-xl ${
                    currentEntry.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {currentEntry.direction === 'long' ? 'trending_up' : 'trending_down'}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-lg">{currentEntry.instrument}</p>
                  <p className="text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">
                    {currentEntry.direction}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-lg font-bold mono-num ${
                  pnlValue > 0 ? 'text-[var(--success)]' : pnlValue < 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
                }`}>
                  {pnlValue > 0 ? '+' : ''}{pnlValue.toFixed(2)}
                </p>
                <p className="text-xs text-[var(--muted)] mono-num">
                  {currentEntry.entry_price} → {currentEntry.exit_price ?? '—'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] mono-num">{currentEntry.trade_date}</p>

            <hr className="border-[var(--glass-surface-border)]" />

            {/* Emotion Picker */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-[var(--muted)]">
                How were you feeling before this trade?
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((emotion) => (
                  <motion.button
                    key={emotion.value}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelectedEmotion(
                      selectedEmotion === emotion.value ? null : emotion.value
                    )}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${selectedEmotion === emotion.value
                        ? 'glass-surface border border-[var(--gold)] text-[var(--gold)] shadow-[0_0_12px_rgba(var(--gold-rgb),0.15)]'
                        : 'border border-[var(--glass-surface-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20'
                      }
                    `}
                  >
                    <span className="text-base">{emotion.icon}</span>
                    <span>{emotion.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Setup Type Picker */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-[var(--muted)]">
                What setup was this?
              </label>
              <div className="flex flex-wrap gap-2">
                {SETUP_TYPES.map((setup) => (
                  <motion.button
                    key={setup.value}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelectedSetup(
                      selectedSetup === setup.value ? null : setup.value
                    )}
                    className={`
                      flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${selectedSetup === setup.value
                        ? 'glass-surface border border-[var(--gold)] text-[var(--gold)] shadow-[0_0_12px_rgba(var(--gold-rgb),0.15)]'
                        : 'border border-[var(--glass-surface-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-[18px]">{setup.icon}</span>
                    <span>{setup.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Execution Rating */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-[var(--muted)]">
                How well did you execute?
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => setExecutionRating(executionRating === star ? 0 : star)}
                    className="p-1"
                  >
                    <span className={`material-symbols-outlined text-3xl transition-colors duration-200 ${
                      star <= executionRating
                        ? 'text-[var(--gold)]'
                        : 'text-[var(--glass-surface-border)]'
                    }`}
                      style={{ fontVariationSettings: star <= executionRating ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {currentIndex > 0 && (
                  <button
                    onClick={goToPrev}
                    className="btn-glass px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                    Back
                  </button>
                )}

                <button
                  onClick={handleSkip}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-3 py-2"
                >
                  Skip
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-gold px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <motion.span
                      className="material-symbols-outlined text-lg"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      sync
                    </motion.span>
                    Saving
                  </>
                ) : (
                  <>
                    Save & {isLast ? 'Finish' : 'Next'}
                    {!isLast && <span className="material-symbols-outlined text-lg">chevron_right</span>}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Keyboard Hint */}
      <p className="text-center text-xs text-[var(--muted)]">
        Use <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-surface-border)] text-[var(--foreground)] font-mono text-[10px]">←</kbd>{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-surface-border)] text-[var(--foreground)] font-mono text-[10px]">→</kbd> to navigate,{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--glass-surface-border)] text-[var(--foreground)] font-mono text-[10px]">Enter</kbd> to save
      </p>
    </div>
  )
}
