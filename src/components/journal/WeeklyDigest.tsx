'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AnimatePresence, motion } from 'framer-motion'
import type { JournalEntry } from '@/types/database'

const DISMISS_KEY = 'pg_weekly_digest_dismissed'

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getLastWeekRange(): { start: Date; end: Date } {
  const thisMonday = getWeekStart()
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)
  const lastSunday = new Date(thisMonday)
  lastSunday.setDate(lastSunday.getDate() - 1)
  lastSunday.setHours(23, 59, 59, 999)
  return { start: lastMonday, end: lastSunday }
}

interface DigestData {
  totalTrades: number
  wins: number
  losses: number
  breakevens: number
  winRate: number
  totalR: number
  avgR: number
  bestTrade: { instrument: string; r: number } | null
  worstTrade: { instrument: string; r: number } | null
  actionItems: string[]
}

function computeDigest(entries: JournalEntry[]): DigestData {
  const wins = entries.filter((e) => e.outcome === 'win').length
  const losses = entries.filter((e) => e.outcome === 'loss').length
  const breakevens = entries.filter((e) => e.outcome === 'breakeven').length
  const decided = wins + losses
  const winRate = decided > 0 ? wins / decided : 0

  const withR = entries.filter((e) => e.r_multiple !== null)
  const totalR = withR.reduce((s, e) => s + (e.r_multiple ?? 0), 0)
  const avgR = withR.length > 0 ? totalR / withR.length : 0

  let bestTrade: DigestData['bestTrade'] = null
  let worstTrade: DigestData['worstTrade'] = null

  for (const e of withR) {
    const r = e.r_multiple!
    if (!bestTrade || r > bestTrade.r) {
      bestTrade = { instrument: e.instrument, r }
    }
    if (!worstTrade || r < worstTrade.r) {
      worstTrade = { instrument: e.instrument, r }
    }
  }

  // Generate action items
  const actionItems: string[] = []

  if (winRate < 0.45 && decided >= 3) {
    actionItems.push('Review your entry criteria — your win rate is below target')
  }
  if (winRate > 0.6 && decided >= 3) {
    actionItems.push('Strong week — document what worked and repeat it')
  }

  const noSL = entries.filter((e) => !e.stop_loss).length
  if (noSL > 0) {
    actionItems.push(`Set stop losses on all trades (${noSL} missing last week)`)
  }

  const negativeEmotion = entries.filter((e) =>
    ['anxious', 'fearful', 'greedy', 'frustrated'].includes(e.emotion_before)
  ).length
  if (negativeEmotion > entries.length * 0.4) {
    actionItems.push('Work on pre-trade mental preparation — too many negative-state entries')
  }

  if (entries.length === 0) {
    actionItems.push('Log at least one trade this week to build your data')
  }

  if (actionItems.length === 0) {
    actionItems.push('Keep trading with discipline — consistency is key')
  }

  return {
    totalTrades: entries.length,
    wins,
    losses,
    breakevens,
    winRate,
    totalR,
    avgR,
    bestTrade,
    worstTrade,
    actionItems: actionItems.slice(0, 3),
  }
}

export function WeeklyDigest() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [digest, setDigest] = useState<DigestData | null>(null)
  const [dismissed, setDismissed] = useState(true)

  const weekKey = getWeekStart().toISOString().split('T')[0]

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissedWeek = localStorage.getItem(DISMISS_KEY)
    // Show digest if not dismissed this week and it's Mon-Wed (first half of week)
    const dayOfWeek = new Date().getDay()
    const isEarlyWeek = dayOfWeek >= 1 && dayOfWeek <= 3
    setDismissed(dismissedWeek === weekKey || !isEarlyWeek)
  }, [weekKey])

  useEffect(() => {
    if (!profile?.id || dismissed) return

    const loadLastWeek = async () => {
      const { start, end } = getLastWeekRange()

      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .gte('trade_date', start.toISOString().split('T')[0])
        .lte('trade_date', end.toISOString().split('T')[0])
        .order('trade_date', { ascending: true })

      if (data) {
        setDigest(computeDigest(data))
      }
    }

    loadLastWeek()
  }, [profile?.id, dismissed, supabase])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, weekKey)
    setDismissed(true)
  }, [weekKey])

  if (dismissed || !digest) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-surface border-[var(--gold)]/20 bg-gradient-to-br from-[var(--gold)]/5 to-transparent overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[var(--gold)]">summarize</span>
              <h3 className="text-sm font-bold">Last Week&apos;s Recap</h3>
            </div>
            <button
              onClick={dismiss}
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {digest.totalTrades === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No trades logged last week. Consistency builds edge — try to log at least one trade this week.
            </p>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Trades</p>
                  <p className="text-lg font-bold">{digest.totalTrades}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Win Rate</p>
                  <p className={`text-lg font-bold ${digest.winRate >= 0.5 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {Math.round(digest.winRate * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Total R</p>
                  <p className={`text-lg font-bold ${digest.totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {digest.totalR >= 0 ? '+' : ''}{digest.totalR.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">W/L</p>
                  <p className="text-lg font-bold">
                    <span className="text-[var(--success)]">{digest.wins}</span>
                    <span className="text-[var(--muted)]">/</span>
                    <span className="text-[var(--danger)]">{digest.losses}</span>
                  </p>
                </div>
              </div>

              {/* Action items */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest">This week&apos;s focus</p>
                {digest.actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-xs text-[var(--gold)] mt-0.5">arrow_right</span>
                    <p className="text-xs text-[var(--muted)]">{item}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
