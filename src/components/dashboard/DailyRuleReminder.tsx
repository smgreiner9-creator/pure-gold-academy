'use client'

import { useState, useSyncExternalStore, useCallback } from 'react'

interface ClassroomRule {
  rule_text: string
  description?: string | null
}

interface Props {
  classroomRules?: ClassroomRule[]
}

const tradingRules = [
  { rule: 'Always use a stop loss', icon: 'shield' },
  { rule: 'Risk only 1-2% per trade', icon: 'percent' },
  { rule: 'Wait for confirmation before entry', icon: 'hourglass_empty' },
  { rule: 'Trade with the trend, not against it', icon: 'trending_up' },
  { rule: 'Check the economic calendar first', icon: 'calendar_today' },
  { rule: 'Never revenge trade after a loss', icon: 'psychology' },
  { rule: 'Stick to your trading plan', icon: 'checklist' },
  { rule: 'Take profits, don\'t be greedy', icon: 'savings' },
  { rule: 'Journal every trade, win or lose', icon: 'edit_note' },
  { rule: 'Trade only during your best sessions', icon: 'schedule' },
  { rule: 'Size your position based on stop distance', icon: 'calculate' },
  { rule: 'Accept losses as part of the game', icon: 'balance' },
  { rule: 'Review your journal weekly', icon: 'analytics' },
  { rule: 'Don\'t overtrade - quality over quantity', icon: 'filter_list' },
  { rule: 'Stay patient, the setup will come', icon: 'self_improvement' },
]

function getDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getDailyRule(classroomRules?: ClassroomRule[]) {
  const dayOfYear = getDayOfYear()

  // Use classroom rules if provided and non-empty
  if (classroomRules && classroomRules.length > 0) {
    const rule = classroomRules[dayOfYear % classroomRules.length]
    return { rule: rule.rule_text, icon: 'school' }
  }

  // Fall back to generic trading rules
  return tradingRules[dayOfYear % tradingRules.length]
}

// No-op subscribe for useSyncExternalStore
const emptySubscribe = () => () => {}

// Hook to check localStorage using React 19 pattern
function useIsDismissedToday() {
  const getSnapshot = useCallback(() => {
    const dismissedDate = localStorage.getItem('rule_dismissed_date')
    const today = new Date().toISOString().split('T')[0]
    return dismissedDate === today
  }, [])

  // Return true on server to hide during SSR
  const getServerSnapshot = useCallback(() => true, [])

  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)
}

export function DailyRuleReminder({ classroomRules }: Props) {
  const isDismissedFromStorage = useIsDismissedToday()
  const [userDismissed, setUserDismissed] = useState(false)

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('rule_dismissed_date', today)
    setUserDismissed(true)
  }

  // Don't render if already dismissed (from storage or user action)
  if (isDismissedFromStorage || userDismissed) return null

  const dailyRule = getDailyRule(classroomRules)

  return (
    <div className="p-4 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">{dailyRule.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-1">
            Today&apos;s Reminder
          </p>
          <p className="text-sm font-medium">{dailyRule.rule}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[var(--muted)] hover:text-white transition-colors shrink-0"
          title="Dismiss for today"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  )
}
