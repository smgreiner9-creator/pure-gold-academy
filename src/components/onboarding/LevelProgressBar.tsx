'use client'

import { motion } from 'framer-motion'
import { useProgressiveLevel } from '@/hooks/useProgressiveLevel'
import { useAuth } from '@/hooks/useAuth'

export default function LevelProgressBar() {
  const { profile } = useAuth()
  const { level, nextLevel, progress } = useProgressiveLevel()

  // Don't render until profile has loaded
  if (!profile) return null

  const isMaxed = !nextLevel

  return (
    <div className="glass-surface border border-[var(--glass-surface-border)] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        {/* Level Badge */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full gold-gradient text-xs font-bold text-[var(--background)]">
            {level.level}
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {level.title}
          </span>
        </div>

        {/* Status Text */}
        {isMaxed ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-[var(--gold)]">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px' }}
            >
              emoji_events
            </span>
            Trading Pro
          </span>
        ) : (
          <span className="text-xs text-[var(--muted)]">
            {progress.current}/{progress.target} trades to Level {nextLevel.level}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--background)]">
        <motion.div
          className="h-full rounded-full gold-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
