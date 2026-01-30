'use client'

import { useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface UserPopoverProps {
  isOpen: boolean
  onClose: () => void
  displayName: string | null | undefined
  email: string | null | undefined
  role: string | null | undefined
  onSignOut: () => void
}

export function UserPopover({ isOpen, onClose, displayName, email, role, onSignOut }: UserPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full left-2 right-2 mb-2 p-3 rounded-xl bg-white border border-black/[0.06] shadow-lg z-50"
        >
          <div className="mb-3">
            <p className="text-sm font-semibold truncate">
              {displayName || email || 'User'}
            </p>
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
              {role || 'Student'}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
