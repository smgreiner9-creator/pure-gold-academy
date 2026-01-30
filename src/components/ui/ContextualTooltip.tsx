'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const STORAGE_KEY = 'pg_tooltips_dismissed'

function getDismissed(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function markDismissed(id: string) {
  const dismissed = getDismissed()
  if (!dismissed.includes(id)) {
    dismissed.push(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed))
  }
}

interface ContextualTooltipProps {
  id: string
  message: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  delay?: number
}

export function ContextualTooltip({
  id,
  message,
  position = 'top',
  children,
  delay = 500,
}: ContextualTooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const dismissed = getDismissed()
    if (dismissed.includes(id)) return

    timeoutRef.current = setTimeout(() => {
      setVisible(true)
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [id, delay])

  const dismiss = () => {
    setVisible(false)
    markDismissed(id)
  }

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--gold)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--gold)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--gold)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--gold)] border-y-transparent border-l-transparent',
  }

  return (
    <div className="relative inline-flex">
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionClasses[position]}`}
          >
            <div className="relative bg-[var(--gold)] text-black rounded-lg px-3 py-2 text-xs font-medium max-w-[200px] shadow-lg">
              <p>{message}</p>
              <button
                onClick={dismiss}
                className="mt-1 text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity"
              >
                Got it
              </button>
              <div
                className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
