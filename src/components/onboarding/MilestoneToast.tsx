'use client'

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Milestone {
  trades: number
  title: string
  description: string
  icon: string
}

const MILESTONES: Milestone[] = [
  { trades: 1, title: 'First Trade Logged', description: 'Your journal journey begins', icon: 'rocket_launch' },
  { trades: 5, title: 'Getting Consistent', description: 'Analytics & community unlocked', icon: 'insights' },
  { trades: 10, title: 'Dedicated Trader', description: 'You can now share trades publicly', icon: 'groups' },
  { trades: 25, title: 'Journaling Pro', description: 'You have built a real data set', icon: 'emoji_events' },
  { trades: 50, title: 'Half Century', description: '50 trades documented — powerful', icon: 'military_tech' },
  { trades: 100, title: 'Century Club', description: '100 trades — elite discipline', icon: 'workspace_premium' },
]

const SEEN_KEY = 'pg_milestones_seen'

function getSeenMilestones(): number[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
  } catch {
    return []
  }
}

function markMilestoneSeen(trades: number) {
  const seen = getSeenMilestones()
  if (!seen.includes(trades)) {
    seen.push(trades)
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  }
}

interface MilestoneToastProps {
  tradesLogged: number
}

export function MilestoneToast({ tradesLogged }: MilestoneToastProps) {
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null)

  const dismiss = useCallback(() => {
    if (activeMilestone) {
      markMilestoneSeen(activeMilestone.trades)
    }
    setActiveMilestone(null)
  }, [activeMilestone])

  useEffect(() => {
    const seen = getSeenMilestones()
    const newMilestone = MILESTONES.find(
      (m) => tradesLogged >= m.trades && !seen.includes(m.trades)
    )
    if (newMilestone) {
      setActiveMilestone(newMilestone)
    }
  }, [tradesLogged])

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!activeMilestone) return
    const timer = setTimeout(dismiss, 6000)
    return () => clearTimeout(timer)
  }, [activeMilestone, dismiss])

  return (
    <AnimatePresence>
      {activeMilestone && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full mx-4"
        >
          <div
            className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--gold)]/30 glass-floating shadow-lg shadow-[var(--gold)]/5 cursor-pointer"
            onClick={dismiss}
          >
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-black">
                {activeMilestone.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{activeMilestone.title}</p>
              <p className="text-xs text-[var(--muted)]">{activeMilestone.description}</p>
            </div>
            <span className="material-symbols-outlined text-[var(--muted)] text-sm shrink-0">close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
