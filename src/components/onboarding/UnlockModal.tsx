'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { UnlockLevel } from '@/types/database'

interface UnlockModalProps {
  level: UnlockLevel
  nextLevel: UnlockLevel | null
  onClose: () => void
}

export default function UnlockModal({ level, nextLevel, onClose }: UnlockModalProps) {
  const tradesUntilNext = nextLevel ? nextLevel.trades - level.trades : 0

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Gold gradient border wrapper */}
          <div className="gold-gradient p-[1px] rounded-2xl">
            <div className="glass-elevated rounded-2xl p-8 text-center">
              {/* Level Circle */}
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full gold-gradient shadow-lg shadow-[var(--gold)]/20">
                <span className="text-3xl font-bold text-[var(--background)]">
                  {level.level}
                </span>
              </div>

              {/* Title */}
              <h2 className="mb-1 text-2xl font-bold text-[var(--foreground)]">
                Level Up!
              </h2>
              <p className="mb-6 text-lg font-semibold text-[var(--gold)]">
                Level {level.level}: {level.title}
              </p>

              {/* Unlocked Features */}
              <div className="mb-6 space-y-3 text-left">
                <p className="text-sm font-medium uppercase tracking-wider text-[var(--muted)]">
                  Unlocked
                </p>
                <ul className="space-y-2">
                  {level.unlocks.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-[var(--foreground)]"
                    >
                      <span
                        className="material-symbols-outlined text-[var(--success)]"
                        style={{ fontSize: '20px' }}
                      >
                        check_circle
                      </span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next Level Hint */}
              {nextLevel && (
                <div className="mb-6 rounded-xl glass-surface border border-[var(--glass-surface-border)] px-4 py-3">
                  <p className="text-sm text-[var(--muted)]">
                    Next:{' '}
                    <span className="font-medium text-[var(--foreground)]">
                      {nextLevel.title}
                    </span>{' '}
                    &mdash; log {tradesUntilNext} more trade{tradesUntilNext !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={onClose}
                className="btn-gold w-full rounded-xl px-6 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
              >
                Continue
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
