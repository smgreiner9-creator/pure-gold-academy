'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useJournalRoute } from '@/hooks/useJournalRoute'
import { QuickTradeEntry } from '@/components/dashboard/QuickTradeEntry'
import { calculateStreak } from '@/lib/streakUtils'

const getSessionInfo = () => {
  const hour = new Date().getUTCHours()
  // Trading sessions (approximate UTC times)
  if (hour >= 22 || hour < 7) {
    return { name: 'SYD/TOK', active: true }
  } else if (hour >= 7 && hour < 8) {
    return { name: 'TOK/LON', active: true }
  } else if (hour >= 8 && hour < 12) {
    return { name: 'LONDON', active: true }
  } else if (hour >= 12 && hour < 17) {
    return { name: 'LON/NY', active: true }
  } else if (hour >= 17 && hour < 22) {
    return { name: 'NEW YORK', active: true }
  } else {
    return { name: 'OFF', active: false }
  }
}

export function StatsHeader() {
  const isJournalRoute = useJournalRoute()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false)
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    avgRMultiple: 0,
    journalStreak: 0,
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [session, setSession] = useState(getSessionInfo)

  const loadStats = useCallback(async () => {
    const userId = profile?.id
    if (!userId) return

    try {
      // Fetch journal entries and check-ins in parallel
      const [entriesRes, checkinsRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('outcome, r_multiple, trade_date')
          .eq('user_id', userId)
          .order('trade_date', { ascending: false }),
        supabase
          .from('daily_checkins')
          .select('check_date')
          .eq('user_id', userId)
      ])

      const entries = entriesRes.data || []
      const checkins = checkinsRes.data || []

      if (entries.length > 0) {
        const wins = entries.filter(e => e.outcome === 'win').length
        const totalWithOutcome = entries.filter(e => e.outcome).length
        const avgR = entries.reduce((sum, e) => sum + (e.r_multiple || 0), 0) / entries.length

        // Use shared streak utility with rest day support
        const tradeDates = [...new Set(entries.map(e => e.trade_date))]
        const checkinDates = checkins.map(c => c.check_date)
        const streakData = calculateStreak(tradeDates, checkinDates, 1)

        setStats({
          totalTrades: entries.length,
          winRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
          avgRMultiple: avgR,
          journalStreak: streakData.currentStreak,
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [profile, supabase])

  useEffect(() => {
    const fetchStats = async () => {
      if (profile?.id) {
        await loadStats()
      }
    }
    fetchStats()
  }, [profile?.id, loadStats])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      setSession(getSessionInfo())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Only show on journal-related pages
  if (!isJournalRoute) {
    return null
  }

  return (
    <header className="h-16 border-b border-[var(--card-border)] bg-[var(--card-bg)] flex items-center px-4 lg:px-6 justify-between shrink-0">
      {/* Stats */}
      <div className="flex items-center divide-x divide-[var(--card-border)]">
        <div className="pr-6 lg:pr-8 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider leading-none mb-1">
            Total Trades
          </span>
          <div className="flex items-end gap-3">
            <span className="mono-num text-lg lg:text-xl font-bold leading-none">{stats.totalTrades}</span>
            <div className="sparkline w-10 h-3 text-[var(--gold)] mb-0.5 hidden sm:block"></div>
          </div>
        </div>

        <div className="px-6 lg:px-8 flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider leading-none mb-1">
            Win Rate
          </span>
          <div className="flex items-end gap-3">
            <span className={`mono-num text-lg lg:text-xl font-bold leading-none ${
              stats.winRate >= 50 ? 'text-[var(--success)]' : stats.winRate > 0 ? 'text-[var(--danger)]' : ''
            }`}>
              {stats.winRate.toFixed(1)}%
            </span>
            <div className="sparkline w-10 h-3 text-[var(--success)] mb-0.5 hidden sm:block"></div>
          </div>
        </div>

        <div className="px-6 lg:px-8 flex-col hidden md:flex">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider leading-none mb-1">
            Avg R-Multiple
          </span>
          <div className="flex items-end gap-3">
            <span className="mono-num text-lg lg:text-xl font-bold leading-none">{stats.avgRMultiple.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-6 lg:px-8 flex-col hidden lg:flex">
          <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider leading-none mb-1">
            Journal Streak
          </span>
          <div className="flex items-end gap-3">
            <span className="mono-num text-lg lg:text-xl font-bold text-[var(--gold)] leading-none">
              {stats.journalStreak} <span className="text-xs font-normal text-[var(--muted)]">DAYS</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Session Indicator */}
        <div className="flex-col items-end mr-2 hidden sm:flex">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase">Current Session</span>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${session.active ? 'bg-[var(--success)]' : 'bg-[var(--muted)]'}`}></div>
            <span className="mono-num text-xs font-semibold">{formatTime(currentTime)}</span>
            <span className="text-[10px] bg-[var(--background)] px-1.5 py-0.5 rounded text-[var(--muted)]">
              {session.name}
            </span>
          </div>
        </div>

        {/* New Entry Button */}
        <button
          onClick={() => setIsQuickTradeOpen(true)}
          className="gold-gradient text-black font-bold h-10 px-4 lg:px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all gold-glow text-sm"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">NEW ENTRY</span>
        </button>
      </div>

      {/* QuickTradeEntry Modal */}
      <QuickTradeEntry
        isOpen={isQuickTradeOpen}
        onClose={() => setIsQuickTradeOpen(false)}
      />
    </header>
  )
}
