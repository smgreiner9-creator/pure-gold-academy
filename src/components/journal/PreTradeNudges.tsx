'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateNudges } from '@/lib/nudgeEngine'
import type { JournalEntry, EmotionType } from '@/types/database'

interface PreTradeNudgesProps {
  entries: JournalEntry[]
  instrument?: string
  emotion?: EmotionType
}

const severityStyles: Record<
  'info' | 'warning' | 'danger',
  { bg: string; border: string; icon: string }
> = {
  info: {
    bg: 'bg-blue-500/5',
    border: 'border-l-blue-500',
    icon: 'text-blue-400',
  },
  warning: {
    bg: 'bg-[var(--gold)]/5',
    border: 'border-l-[var(--gold)]',
    icon: 'text-[var(--gold)]',
  },
  danger: {
    bg: 'bg-[var(--danger)]/5',
    border: 'border-l-[var(--danger)]',
    icon: 'text-[var(--danger)]',
  },
}

export function PreTradeNudges({
  entries,
  instrument,
  emotion,
}: PreTradeNudgesProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const nudges = useMemo(
    () => generateNudges(entries, { instrument, emotion }),
    [entries, instrument, emotion]
  )

  const visibleNudges = nudges.filter((n) => !dismissed.has(n.id))

  if (visibleNudges.length === 0) return null

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {visibleNudges.map((nudge) => {
          const styles = severityStyles[nudge.severity]

          return (
            <motion.div
              key={nudge.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`${styles.bg} border-l-[3px] ${styles.border} rounded-lg px-4 py-3 flex items-start gap-3`}
            >
              <span
                className={`material-symbols-outlined ${styles.icon} mt-0.5 shrink-0`}
                style={{ fontSize: 20 }}
              >
                {nudge.icon}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {nudge.title}
                </p>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {nudge.message}
                </p>
              </div>

              <button
                onClick={() => handleDismiss(nudge.id)}
                className="shrink-0 p-1 rounded-md hover:bg-white/5 transition-colors"
                aria-label={`Dismiss ${nudge.title}`}
              >
                <span
                  className="material-symbols-outlined text-[var(--muted)] hover:text-[var(--foreground)]"
                  style={{ fontSize: 18 }}
                >
                  close
                </span>
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
