'use client'

import { useState, useEffect } from 'react'

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

function getDailyRule() {
  // Use the day of year to select a rule (changes daily)
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return tradingRules[dayOfYear % tradingRules.length]
}

export function DailyRuleReminder() {
  const [dailyRule, setDailyRule] = useState<{ rule: string; icon: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed today
    const dismissedDate = localStorage.getItem('rule_dismissed_date')
    const today = new Date().toISOString().split('T')[0]

    if (dismissedDate === today) {
      setDismissed(true)
    }

    setDailyRule(getDailyRule())
  }, [])

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem('rule_dismissed_date', today)
    setDismissed(true)
  }

  if (dismissed || !dailyRule) return null

  return (
    <div className="p-4 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">{dailyRule.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-1">
            Today&apos;s Focus
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
