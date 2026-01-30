'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'

interface DayData {
  date: string
  trades: number
  pnl: number
  wins: number
  losses: number
}

interface DayEntry {
  id: string
  instrument: string
  direction: string
  outcome: string | null
  r_multiple: number | null
  pnl: number | null
  entry_price: number
  exit_price: number | null
  trade_date: string
}

interface InsightEntry {
  outcome: string | null
  r_multiple: number | null
  pnl: number | null
  emotion_before: string | null
  instrument: string
  direction: string
  trade_date: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const NEGATIVE_EMOTIONS = ['anxious', 'fearful', 'greedy', 'frustrated']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getCellColor(day: DayData | undefined): string {
  if (!day || day.trades === 0) return 'bg-black/[0.03]'
  if (day.pnl > 0) {
    if (day.pnl > 100) return 'bg-[var(--success)]'
    if (day.pnl > 50) return 'bg-[var(--success)]/70'
    return 'bg-[var(--success)]/40'
  }
  if (day.pnl < 0) {
    if (day.pnl < -100) return 'bg-[var(--danger)]'
    if (day.pnl < -50) return 'bg-[var(--danger)]/70'
    return 'bg-[var(--danger)]/40'
  }
  // Journaled but no P&L (open trades or breakeven)
  return 'ring-1 ring-[var(--gold)]/40 bg-[var(--gold)]/10'
}

function getCellTextColor(day: DayData | undefined): string {
  if (!day || day.trades === 0) return ''
  if (day.pnl > 100 || day.pnl < -100) return 'text-white'
  if (day.pnl > 50) return 'text-white/90'
  if (day.pnl < -50) return 'text-white/90'
  if (day.pnl > 0) return 'text-[var(--success)]'
  if (day.pnl < 0) return 'text-[var(--danger)]'
  return 'text-[var(--gold)]'
}

function generateInsight(entries: InsightEntry[]): { icon: string; text: string } | null {
  if (entries.length === 0) {
    return { icon: 'calendar_today', text: 'No trades this month yet.' }
  }
  if (entries.length < 3) {
    return { icon: 'info', text: `Only ${entries.length} trade${entries.length === 1 ? '' : 's'} this month. Consistency builds edge.` }
  }

  const decided = entries.filter(e => e.outcome === 'win' || e.outcome === 'loss')
  const overallWR = decided.length > 0 ? decided.filter(e => e.outcome === 'win').length / decided.length : 0

  // Priority 1: Negative emotion pattern
  const emotionCounts: Record<string, { total: number; wins: number }> = {}
  for (const e of entries) {
    if (e.emotion_before && NEGATIVE_EMOTIONS.includes(e.emotion_before)) {
      if (!emotionCounts[e.emotion_before]) emotionCounts[e.emotion_before] = { total: 0, wins: 0 }
      emotionCounts[e.emotion_before].total++
      if (e.outcome === 'win') emotionCounts[e.emotion_before].wins++
    }
  }

  for (const [emotion, stats] of Object.entries(emotionCounts)) {
    if (stats.total >= 3) {
      const emotionDecided = entries.filter(e => e.emotion_before === emotion && (e.outcome === 'win' || e.outcome === 'loss'))
      const emotionWR = emotionDecided.length > 0 ? emotionDecided.filter(e => e.outcome === 'win').length / emotionDecided.length : 0
      const diff = overallWR - emotionWR
      if (diff > 0.1) {
        return {
          icon: 'psychology',
          text: `You've taken ${stats.total} trades feeling ${emotion} this month — your win rate drops ${Math.round(diff * 100)}% when ${emotion}.`,
        }
      }
    }
  }

  // Priority 2: Streak observation
  const sorted = [...entries].sort((a, b) => a.trade_date.localeCompare(b.trade_date))
  let maxStreak = 0
  let streakType: 'win' | 'loss' | null = null
  let streakStart = ''
  let streakEnd = ''
  let cur = 0
  let curType: 'win' | 'loss' | null = null
  let curStart = ''

  for (const e of sorted) {
    if (e.outcome === 'win' || e.outcome === 'loss') {
      if (e.outcome === curType) {
        cur++
      } else {
        curType = e.outcome as 'win' | 'loss'
        cur = 1
        curStart = e.trade_date
      }
      if (cur > maxStreak) {
        maxStreak = cur
        streakType = curType
        streakStart = curStart
        streakEnd = e.trade_date
      }
    } else {
      curType = null
      cur = 0
    }
  }

  if (maxStreak >= 3 && streakType) {
    const startDay = new Date(streakStart + 'T12:00:00').getDate()
    const endDay = new Date(streakEnd + 'T12:00:00').getDate()
    return {
      icon: streakType === 'win' ? 'local_fire_department' : 'warning',
      text: `You hit a ${maxStreak}-${streakType} streak around the ${startDay}th–${endDay}th.`,
    }
  }

  // Priority 3: Best day of week
  const dayGroups: Record<number, { total: number; wins: number }> = {}
  for (const e of entries) {
    const day = new Date(e.trade_date + 'T12:00:00').getDay()
    if (!dayGroups[day]) dayGroups[day] = { total: 0, wins: 0 }
    dayGroups[day].total++
    if (e.outcome === 'win') dayGroups[day].wins++
  }

  let bestDay = -1
  let bestDayWR = 0
  for (const [day, stats] of Object.entries(dayGroups)) {
    if (stats.total >= 3) {
      const wr = stats.wins / stats.total
      if (wr > bestDayWR) {
        bestDayWR = wr
        bestDay = Number(day)
      }
    }
  }

  if (bestDay >= 0 && bestDayWR > overallWR + 0.1) {
    return {
      icon: 'calendar_today',
      text: `Your best day is ${DAY_NAMES[bestDay]} with a ${Math.round(bestDayWR * 100)}% win rate.`,
    }
  }

  // Priority 4: Instrument focus
  const instrumentCounts: Record<string, number> = {}
  for (const e of entries) {
    const inst = e.instrument.toUpperCase()
    instrumentCounts[inst] = (instrumentCounts[inst] || 0) + 1
  }
  const topInstrument = Object.entries(instrumentCounts).sort((a, b) => b[1] - a[1])[0]
  if (topInstrument && topInstrument[1] >= entries.length * 0.5 && entries.length >= 3) {
    return {
      icon: 'candlestick_chart',
      text: `${topInstrument[1]} of your ${entries.length} trades were ${topInstrument[0]}.`,
    }
  }

  // Fallback: show win rate
  if (decided.length >= 3) {
    return {
      icon: 'query_stats',
      text: `Your win rate this month is ${Math.round(overallWR * 100)}% across ${entries.length} trades.`,
    }
  }

  return null
}

function getMonthDays(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // getDay() returns 0=Sun...6=Sat, we want Mon=0
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  return { daysInMonth, startDow }
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function CalendarHeatmap() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [dayMap, setDayMap] = useState<Record<string, DayData>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [insightEntries, setInsightEntries] = useState<InsightEntry[]>([])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const { daysInMonth, startDow } = useMemo(() => getMonthDays(year, month), [year, month])

  const monthTitle = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const navigateMonth = (delta: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setSelectedDate(null)
    setDayEntries([])
  }

  // Load heatmap data for the current month
  const loadHeatmapData = useCallback(async () => {
    if (!profile?.id) return

    const startDate = formatDate(year, month, 1)
    const endDate = formatDate(year, month, daysInMonth)

    // Single query with all needed columns (insight fields are a superset of heatmap fields)
    const { data, error } = await supabase
      .from('journal_entries')
      .select('outcome, r_multiple, pnl, emotion_before, instrument, direction, trade_date')
      .eq('user_id', profile.id)
      .gte('trade_date', startDate)
      .lte('trade_date', endDate)
      .order('trade_date', { ascending: true })

    if (!error && data) {
      // Derive heatmap data from the same result
      const map: Record<string, DayData> = {}
      for (const entry of data) {
        const date = entry.trade_date
        if (!map[date]) {
          map[date] = { date, trades: 0, pnl: 0, wins: 0, losses: 0 }
        }
        map[date].trades++
        map[date].pnl += entry.pnl || 0
        if (entry.outcome === 'win') map[date].wins++
        if (entry.outcome === 'loss') map[date].losses++
      }
      setDayMap(map)
      setInsightEntries(data as InsightEntry[])
    }
  }, [profile?.id, supabase, year, month, daysInMonth])

  useEffect(() => {
    loadHeatmapData()
  }, [loadHeatmapData])

  // Load entries for a selected day
  const loadDayEntries = useCallback(async (date: string) => {
    if (!profile?.id) return
    setLoadingEntries(true)

    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, instrument, direction, outcome, r_multiple, pnl, entry_price, exit_price, trade_date')
      .eq('user_id', profile.id)
      .eq('trade_date', date)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDayEntries(data as DayEntry[])
    }
    setLoadingEntries(false)
  }, [profile?.id, supabase])

  const handleDayClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null)
      setDayEntries([])
    } else {
      setSelectedDate(dateStr)
      loadDayEntries(dateStr)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const insight = useMemo(() => generateInsight(insightEntries), [insightEntries])

  // Month stats
  const monthStats = useMemo(() => {
    const totalTrades = insightEntries.length
    const decided = insightEntries.filter(e => e.outcome === 'win' || e.outcome === 'loss')
    const wins = decided.filter(e => e.outcome === 'win').length
    const winRate = decided.length > 0 ? Math.round((wins / decided.length) * 100) : 0
    const withR = insightEntries.filter(e => e.r_multiple !== null)
    const totalR = withR.reduce((sum, e) => sum + (e.r_multiple ?? 0), 0)
    return { totalTrades, winRate, totalR, hasData: totalTrades > 0 }
  }, [insightEntries])

  // Build calendar grid rows
  const totalCells = startDow + daysInMonth
  const rows = Math.ceil(totalCells / 7)

  return (
    <div className="space-y-4">
      {/* Calendar + Insight Panel */}
      <div className="glass-surface p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest">Trading Activity</h3>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="w-3.5 h-3.5 rounded-sm bg-black/[0.03]" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--success)]/40" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--success)]/70" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--success)]" />
            </div>
            <span>Profit</span>
            <div className="w-px h-3 bg-[var(--glass-surface-border)] mx-1" />
            <div className="flex gap-0.5">
              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--danger)]/40" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--danger)]/70" />
              <div className="w-3.5 h-3.5 rounded-sm bg-[var(--danger)]" />
            </div>
            <span>Loss</span>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Calendar (left) */}
          <div className="lg:w-[60%]">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-[var(--muted)]">chevron_left</span>
              </button>
              <span className="text-sm font-bold">{monthTitle}</span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-[var(--muted)]">chevron_right</span>
              </button>
            </div>

            {/* Day labels header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map(label => (
                <div key={label} className="text-[10px] text-[var(--muted)] text-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: rows * 7 }, (_, idx) => {
                const dayNum = idx - startDow + 1
                const isValidDay = dayNum >= 1 && dayNum <= daysInMonth

                if (!isValidDay) {
                  return <div key={idx} className="w-10 h-10" />
                }

                const dateStr = formatDate(year, month, dayNum)
                const dayData = dayMap[dateStr]
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                const isFuture = dateStr > today
                const hasTrades = dayData && dayData.trades > 0

                return (
                  <button
                    key={idx}
                    onClick={() => !isFuture && handleDayClick(dateStr)}
                    disabled={isFuture}
                    title={`${dateStr}${dayData ? ` — ${dayData.trades} trade${dayData.trades !== 1 ? 's' : ''}, $${dayData.pnl.toFixed(0)}` : ''}`}
                    className={`w-10 h-10 rounded-lg transition-all relative flex flex-col items-center justify-center ${getCellColor(dayData)} ${
                      isToday ? 'ring-1 ring-[var(--foreground)]/30' : ''
                    } ${
                      isSelected ? 'ring-2 ring-[var(--gold)]' : ''
                    } ${
                      isFuture ? 'opacity-20 cursor-default' : 'hover:ring-1 hover:ring-[var(--foreground)]/20 cursor-pointer'
                    }`}
                  >
                    <span className={`text-[10px] leading-none ${hasTrades ? getCellTextColor(dayData) : 'text-[var(--muted)]'}`}>
                      {dayNum}
                    </span>
                    {hasTrades && (
                      <span className={`text-[9px] font-bold leading-none mt-0.5 ${getCellTextColor(dayData)}`}>
                        {dayData.trades}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Insight panel (right) */}
          <div className="lg:w-[40%] flex flex-col gap-3">
            <div className="glass-elevated p-4 rounded-xl flex-1">
              <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Monthly Insight</h4>
              {insight ? (
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-lg text-[var(--gold)] shrink-0 mt-0.5">
                    {insight.icon}
                  </span>
                  <p className="text-sm leading-relaxed">{insight.text}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Not enough data for insights yet.</p>
              )}
            </div>

            {/* Month stats */}
            {monthStats.hasData && (
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-elevated p-3 rounded-xl text-center">
                  <div className="text-lg font-bold mono-num">{monthStats.totalTrades}</div>
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Trades</div>
                </div>
                <div className="glass-elevated p-3 rounded-xl text-center">
                  <div className="text-lg font-bold mono-num">{monthStats.winRate}%</div>
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Win Rate</div>
                </div>
                <div className="glass-elevated p-3 rounded-xl text-center">
                  <div className={`text-lg font-bold mono-num ${monthStats.totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {monthStats.totalR >= 0 ? '+' : ''}{monthStats.totalR.toFixed(1)}R
                  </div>
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Total R</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day Detail Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass-elevated p-4 border-[var(--gold)]/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h4>
                <button
                  onClick={() => { setSelectedDate(null); setDayEntries([]) }}
                  className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {loadingEntries ? (
                <div className="flex items-center gap-2 py-4 text-[var(--muted)] text-sm">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Loading...
                </div>
              ) : dayEntries.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-[var(--muted)] mb-3">No trades on this day</p>
                  <Link
                    href={`/journal/new?date=${selectedDate}`}
                    className="text-xs text-[var(--gold)] hover:underline"
                  >
                    Log a trade for this day
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/journal/${entry.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--glass-surface-border)] hover:border-[var(--gold)]/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          entry.outcome === 'win' ? 'text-[var(--success)] bg-[var(--success)]/10' :
                          entry.outcome === 'loss' ? 'text-[var(--danger)] bg-[var(--danger)]/10' :
                          'text-[var(--muted)] bg-black/5'
                        }`}>
                          {entry.outcome || 'Open'}
                        </span>
                        <span className="text-sm font-bold">{entry.instrument}</span>
                        <span className={`text-xs font-semibold ${
                          entry.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                        }`}>
                          {entry.direction.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.r_multiple !== null && (
                          <span className={`mono-num text-sm font-bold ${
                            entry.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}>
                            {entry.r_multiple >= 0 ? '+' : ''}{entry.r_multiple.toFixed(1)}R
                          </span>
                        )}
                        <span className="material-symbols-outlined text-[var(--muted)] text-sm">chevron_right</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
