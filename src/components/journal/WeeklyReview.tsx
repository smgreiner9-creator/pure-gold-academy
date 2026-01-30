'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useWeeklyFocus } from '@/hooks/useWeeklyFocus'
import { generateInsights } from '@/components/analytics/InsightEngine'
import { AnimatePresence, motion } from 'framer-motion'
import type { JournalEntry } from '@/types/database'
import type { Insight } from '@/components/analytics/InsightEngine'

const DISMISS_KEY = 'pg_weekly_review_dismissed'
const TOTAL_STEPS = 4

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
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

function getPreviousWeekRange(): { start: Date; end: Date } {
  const thisMonday = getWeekStart()
  const twoWeeksAgoMonday = new Date(thisMonday)
  twoWeeksAgoMonday.setDate(twoWeeksAgoMonday.getDate() - 14)
  const twoWeeksAgoSunday = new Date(thisMonday)
  twoWeeksAgoSunday.setDate(twoWeeksAgoSunday.getDate() - 8)
  twoWeeksAgoSunday.setHours(23, 59, 59, 999)
  return { start: twoWeeksAgoMonday, end: twoWeeksAgoSunday }
}

interface WeekStats {
  totalTrades: number
  winRate: number
  totalR: number
  wins: number
  losses: number
}

function computeStats(entries: JournalEntry[]): WeekStats {
  const wins = entries.filter((e) => e.outcome === 'win').length
  const losses = entries.filter((e) => e.outcome === 'loss').length
  const decided = wins + losses
  const winRate = decided > 0 ? wins / decided : 0
  const withR = entries.filter((e) => e.r_multiple !== null)
  const totalR = withR.reduce((s, e) => s + (e.r_multiple ?? 0), 0)
  return { totalTrades: entries.length, winRate, totalR, wins, losses }
}

function ComparisonArrow({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const diff = current - previous
  if (Math.abs(diff) < 0.01) return null

  const improved = diff > 0
  const icon = improved ? 'arrow_upward' : 'arrow_downward'
  const color = improved ? 'text-[var(--success)]' : 'text-[var(--danger)]'
  const label = `${improved ? '+' : ''}${suffix === '%' ? Math.round(diff * 100) : diff.toFixed(1)}${suffix}`

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] ${color}`}>
      <span className="material-symbols-outlined text-[10px]">{icon}</span>
      {label}
    </span>
  )
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

export function WeeklyReview() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const {
    currentFocus,
    lastWeekFocus,
    isLoading: focusLoading,
    setFocus,
    markReviewed,
  } = useWeeklyFocus()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [dismissed, setDismissed] = useState(true)
  const [lastWeekEntries, setLastWeekEntries] = useState<JournalEntry[]>([])
  const [prevWeekEntries, setPrevWeekEntries] = useState<JournalEntry[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewScore, setReviewScore] = useState(3)
  const [focusText, setFocusText] = useState('')
  const [focusSaving, setFocusSaving] = useState(false)
  const [reviewSaving, setReviewSaving] = useState(false)

  const weekKey = getWeekStart().toISOString().split('T')[0]

  // Determine visibility: Mon-Wed only
  useEffect(() => {
    if (typeof window === 'undefined') return
    const dayOfWeek = new Date().getDay()
    const isEarlyWeek = dayOfWeek >= 1 && dayOfWeek <= 3
    const dismissedWeek = localStorage.getItem(DISMISS_KEY)
    setDismissed(dismissedWeek === weekKey || !isEarlyWeek)
  }, [weekKey])

  // Fetch last week & previous week entries
  useEffect(() => {
    if (!profile?.id || dismissed) return

    const load = async () => {
      setIsLoading(true)
      try {
        const lastWeek = getLastWeekRange()
        const prevWeek = getPreviousWeekRange()

        const [lastRes, prevRes] = await Promise.all([
          supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', profile.id)
            .gte('trade_date', lastWeek.start.toISOString().split('T')[0])
            .lte('trade_date', lastWeek.end.toISOString().split('T')[0])
            .order('trade_date', { ascending: true }),
          supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', profile.id)
            .gte('trade_date', prevWeek.start.toISOString().split('T')[0])
            .lte('trade_date', prevWeek.end.toISOString().split('T')[0])
            .order('trade_date', { ascending: true }),
        ])

        const lastEntries = lastRes.data ?? []
        const prevEntries = prevRes.data ?? []

        setLastWeekEntries(lastEntries)
        setPrevWeekEntries(prevEntries)
        setInsights(generateInsights(lastEntries))
      } catch (error) {
        console.error('Failed to load weekly review data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [profile?.id, dismissed, supabase])

  // Suggest focus text from top insight
  useEffect(() => {
    if (insights.length > 0 && !currentFocus && !focusText) {
      setFocusText(insights[0].message.split('.')[0])
    }
  }, [insights, currentFocus, focusText])

  const lastWeekStats = useMemo(() => computeStats(lastWeekEntries), [lastWeekEntries])
  const prevWeekStats = useMemo(() => computeStats(prevWeekEntries), [prevWeekEntries])
  const hasPrevWeek = prevWeekEntries.length > 0
  const topInsight = insights.length > 0 ? insights[0] : null

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    }
  }, [step])

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }, [step])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, weekKey)
    setDismissed(true)
  }, [weekKey])

  const handleSetFocus = useCallback(async () => {
    if (!focusText.trim()) return
    setFocusSaving(true)
    try {
      const type = topInsight?.tag ?? 'general'
      await setFocus(focusText.trim(), type)
    } catch (err) {
      console.error('Failed to set focus:', err)
    } finally {
      setFocusSaving(false)
    }
  }, [focusText, topInsight, setFocus])

  const handleMarkReviewed = useCallback(async () => {
    if (!lastWeekFocus) return
    setReviewSaving(true)
    try {
      await markReviewed(lastWeekFocus.id, reviewScore)
    } catch (err) {
      console.error('Failed to mark reviewed:', err)
    } finally {
      setReviewSaving(false)
    }
  }, [lastWeekFocus, reviewScore, markReviewed])

  if (dismissed || isLoading || focusLoading) return null

  const severityColor: Record<string, string> = {
    danger: 'var(--danger)',
    warning: 'var(--warning)',
    success: 'var(--success)',
    info: 'var(--gold)',
  }

  const stepTitles = ['Your Week', 'Your #1 Pattern', 'Your Focus This Week', 'Summary']

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="glass-surface overflow-hidden relative"
      style={{ borderTop: '2px solid var(--gold)' }}
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-lg"
              style={{ color: 'var(--gold)' }}
            >
              auto_awesome
            </span>
            <h3 className="text-sm font-bold">Weekly Review</h3>
          </div>
          <button
            onClick={dismiss}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 mb-3">
          {stepTitles.map((title, i) => (
            <div key={title} className="flex items-center gap-1.5">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 32 : 16,
                  backgroundColor: i <= step ? 'var(--gold)' : 'var(--glass-surface-border)',
                }}
              />
            </div>
          ))}
          <span className="text-[10px] text-[var(--muted)] ml-auto">
            {step + 1}/{TOTAL_STEPS}
          </span>
        </div>
      </div>

      {/* Step content */}
      <div className="px-4 pb-4 min-h-[180px] relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* Step 0: Your Week */}
            {step === 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-3">
                  {stepTitles[0]}
                </p>

                {lastWeekStats.totalTrades === 0 ? (
                  <p className="text-sm text-[var(--muted)]">
                    No trades logged last week. Keep journaling consistently to unlock your weekly review.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Trades</p>
                      <p className="text-lg font-bold mono-num">{lastWeekStats.totalTrades}</p>
                      {hasPrevWeek && (
                        <ComparisonArrow
                          current={lastWeekStats.totalTrades}
                          previous={prevWeekStats.totalTrades}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Win Rate</p>
                      <p
                        className="text-lg font-bold mono-num"
                        style={{
                          color: lastWeekStats.winRate >= 0.5 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {Math.round(lastWeekStats.winRate * 100)}%
                      </p>
                      {hasPrevWeek && (
                        <ComparisonArrow
                          current={lastWeekStats.winRate}
                          previous={prevWeekStats.winRate}
                          suffix="%"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Total R</p>
                      <p
                        className="text-lg font-bold mono-num"
                        style={{
                          color: lastWeekStats.totalR >= 0 ? 'var(--success)' : 'var(--danger)',
                        }}
                      >
                        {lastWeekStats.totalR >= 0 ? '+' : ''}
                        {lastWeekStats.totalR.toFixed(1)}
                      </p>
                      {hasPrevWeek && (
                        <ComparisonArrow
                          current={lastWeekStats.totalR}
                          previous={prevWeekStats.totalR}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">W/L</p>
                      <p className="text-lg font-bold mono-num">
                        <span style={{ color: 'var(--success)' }}>{lastWeekStats.wins}</span>
                        <span style={{ color: 'var(--muted)' }}>/</span>
                        <span style={{ color: 'var(--danger)' }}>{lastWeekStats.losses}</span>
                      </p>
                      {hasPrevWeek && (
                        <ComparisonArrow
                          current={lastWeekStats.wins - lastWeekStats.losses}
                          previous={prevWeekStats.wins - prevWeekStats.losses}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Your #1 Pattern */}
            {step === 1 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-3">
                  {stepTitles[1]}
                </p>

                {topInsight ? (
                  <div
                    className="glass-elevated rounded-lg p-3 border-l-2"
                    style={{
                      borderLeftColor: severityColor[topInsight.severity] ?? 'var(--gold)',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="material-symbols-outlined text-xl mt-0.5"
                        style={{
                          color: severityColor[topInsight.severity] ?? 'var(--gold)',
                        }}
                      >
                        {topInsight.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{topInsight.title}</h4>
                          {topInsight.stat && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mono-num"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${severityColor[topInsight.severity] ?? 'var(--gold)'} 15%, transparent)`,
                                color: severityColor[topInsight.severity] ?? 'var(--gold)',
                              }}
                            >
                              {topInsight.stat}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted)] leading-relaxed">
                          {topInsight.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-elevated rounded-lg p-4 text-center">
                    <span
                      className="material-symbols-outlined text-2xl mb-2 block"
                      style={{ color: 'var(--muted)' }}
                    >
                      search_insights
                    </span>
                    <p className="text-sm text-[var(--muted)]">
                      Keep logging to unlock patterns
                    </p>
                    <p className="text-[10px] text-[var(--muted)] mt-1">
                      We need more trades to identify your #1 pattern.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Your Focus This Week */}
            {step === 2 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-3">
                  {stepTitles[2]}
                </p>

                {/* Review last week's focus if unreviewed */}
                {lastWeekFocus && !lastWeekFocus.reviewed && (
                  <div className="glass-elevated rounded-lg p-3 mb-3">
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">
                      Last week&apos;s focus
                    </p>
                    <p className="text-sm mb-2.5">{lastWeekFocus.focus_text}</p>

                    <p className="text-[10px] text-[var(--muted)] mb-1.5">
                      How did you do? (1 = no progress, 5 = nailed it)
                    </p>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => setReviewScore(score)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200"
                          style={{
                            backgroundColor:
                              reviewScore === score
                                ? 'var(--gold)'
                                : 'var(--glass-surface-border)',
                            color:
                              reviewScore === score
                                ? 'var(--background)'
                                : 'var(--foreground)',
                          }}
                        >
                          {score}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleMarkReviewed}
                      disabled={reviewSaving}
                      className="btn-glass text-xs px-3 py-1.5 w-full"
                    >
                      {reviewSaving ? 'Saving...' : 'Mark as Reviewed'}
                    </button>
                  </div>
                )}

                {/* Set this week's focus */}
                {currentFocus ? (
                  <div className="glass-elevated rounded-lg p-3 flex items-start gap-2.5">
                    <span
                      className="material-symbols-outlined text-lg mt-0.5"
                      style={{ color: 'var(--success)' }}
                    >
                      check_circle
                    </span>
                    <div>
                      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-0.5">
                        This week&apos;s focus
                      </p>
                      <p className="text-sm font-medium">{currentFocus.focus_text}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {topInsight && (
                      <p className="text-[10px] text-[var(--muted)] mb-1.5">
                        Suggested based on your #1 pattern:
                      </p>
                    )}
                    <input
                      type="text"
                      value={focusText}
                      onChange={(e) => setFocusText(e.target.value)}
                      placeholder="What will you focus on this week?"
                      className="input-field text-sm w-full mb-2.5"
                    />
                    <button
                      onClick={handleSetFocus}
                      disabled={focusSaving || !focusText.trim()}
                      className="btn-gold text-xs px-4 py-2 w-full disabled:opacity-40"
                    >
                      {focusSaving ? 'Setting Focus...' : 'Set Focus'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Summary */}
            {step === 3 && (
              <div className="text-center py-2">
                <span
                  className="material-symbols-outlined text-3xl mb-2 block"
                  style={{ color: 'var(--gold)' }}
                >
                  rocket_launch
                </span>
                <h4 className="text-sm font-bold mb-1">You&apos;re set for this week</h4>
                <p className="text-xs text-[var(--muted)] mb-4 max-w-[260px] mx-auto">
                  {currentFocus
                    ? `Focus: "${currentFocus.focus_text}". Stay intentional and let your data guide you.`
                    : 'Review your trades, stay disciplined, and keep journaling.'}
                </p>
                <button
                  onClick={dismiss}
                  className="btn-gold text-sm px-6 py-2.5 gold-gradient"
                >
                  Continue to Journal
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-0 disabled:pointer-events-none flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </button>

        {step < TOTAL_STEPS - 1 && (
          <button
            onClick={goNext}
            className="text-xs font-medium flex items-center gap-1 transition-colors hover:text-[var(--gold)]"
            style={{ color: 'var(--foreground)' }}
          >
            Next
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>
    </motion.div>
  )
}
