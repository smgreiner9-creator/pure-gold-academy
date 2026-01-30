'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-2xl glass-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span className="material-symbols-outlined text-lg text-[var(--muted)]">{icon}</span>
          )}
          <span className="text-sm font-bold">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gold)]/10 text-[var(--gold)]">
              {badge}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined text-lg text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
