'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface SetupTypePickerProps {
  value: string
  customValue: string
  onChange: (value: string) => void
  onCustomChange: (value: string) => void
}

const SETUP_TYPES = [
  { value: 'breakout', label: 'Breakout', icon: 'north_east' },
  { value: 'pullback', label: 'Pullback', icon: 'south_west' },
  { value: 'reversal', label: 'Reversal', icon: 'swap_vert' },
  { value: 'range', label: 'Range', icon: 'width' },
  { value: 'trend_continuation', label: 'Trend', icon: 'trending_up' },
  { value: 'news', label: 'News', icon: 'newspaper' },
  { value: 'custom', label: 'Custom', icon: 'edit' },
] as const

export function SetupTypePicker({
  value,
  customValue,
  onChange,
  onCustomChange,
}: SetupTypePickerProps) {
  const handleClick = (setupValue: string) => {
    if (value === setupValue) {
      onChange('')
    } else {
      onChange(setupValue)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SETUP_TYPES.map((setup) => {
          const isSelected = value === setup.value

          return (
            <button
              key={setup.value}
              type="button"
              onClick={() => handleClick(setup.value)}
              className={`
                flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${
                  isSelected
                    ? 'glass-surface border border-[var(--gold)] text-[var(--gold)] shadow-[0_0_12px_rgba(var(--gold-rgb),0.15)]'
                    : 'border border-[var(--glass-surface-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20'
                }
              `}
            >
              <span className="material-symbols-outlined text-[18px]">
                {setup.icon}
              </span>
              <span>{setup.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {value === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <input
              type="text"
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder="Enter custom setup name..."
              className="input-field w-full mt-1"
              maxLength={50}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
