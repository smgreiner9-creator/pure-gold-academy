'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { QuickTradeEntry } from '@/components/dashboard/QuickTradeEntry'
import { calculateStreak, getTodayDate } from '@/lib/streakUtils'

export function DailyCheckIn() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showQuickTrade, setShowQuickTrade] = useState(false)

  const [tradeDates, setTradeDates] = useState<string[]>([])
  const [checkinDates, setCheckinDates] = useState<string[]>([])
  const [todayTradeCount, setTodayTradeCount] = useState(0)

  const streakData = useMemo(
    () => calculateStreak(tradeDates, checkinDates, 1),
    [tradeDates, checkinDates]
  )

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      const today = getTodayDate()

      // Load trade dates
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('trade_date')
        .eq('user_id', profile.id)

      const uniqueTradeDates = [...new Set(entries?.map(e => e.trade_date) || [])]
      setTradeDates(uniqueTradeDates)

      // Count today's trades
      const todayTrades = entries?.filter(e => e.trade_date === today).length || 0
      setTodayTradeCount(todayTrades)

      // Load check-in dates
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('check_date')
        .eq('user_id', profile.id)

      setCheckinDates(checkins?.map(c => c.check_date) || [])
    } catch (error) {
      console.error('Error loading check-in data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    loadData()
  }, [profile?.id, loadData])

  const handleNoTradeToday = async () => {
    if (!profile?.id || isSubmitting) return

    setIsSubmitting(true)
    try {
      const today = getTodayDate()

      const { error } = await supabase
        .from('daily_checkins')
        .upsert({
          user_id: profile.id,
          check_date: today,
          has_traded: false,
        }, {
          onConflict: 'user_id,check_date'
        })

      if (error) throw error

      // Update local state
      setCheckinDates(prev => [...new Set([...prev, today])])
    } catch (error) {
      console.error('Error recording check-in:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickTradeClose = () => {
    setShowQuickTrade(false)
    // Reload data to reflect new trade
    loadData()
  }

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass-surface animate-pulse h-28" />
    )
  }

  // Already traded today
  if (streakData.hasTradedToday) {
    return (
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--success)]">check_circle</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--gold)] text-lg">local_fire_department</span>
                <span className="font-bold text-lg">{streakData.currentStreak} day streak</span>
              </div>
              <p className="text-sm text-[var(--muted)]">
                You&apos;ve logged {todayTradeCount} trade{todayTradeCount !== 1 ? 's' : ''} today
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowQuickTrade(true)}
            className="h-10 px-4 rounded-lg btn-glass text-sm font-semibold hover:bg-black/5 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Log Another
          </button>
        </div>

        <QuickTradeEntry isOpen={showQuickTrade} onClose={handleQuickTradeClose} />
      </div>
    )
  }

  // Checked in (rest day)
  if (streakData.hasCheckedInToday && !streakData.hasTradedToday) {
    return (
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">bedtime</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--gold)] text-lg">local_fire_department</span>
                <span className="font-bold text-lg">{streakData.currentStreak} day streak</span>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Rest day recorded - streak protected
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowQuickTrade(true)}
            className="gold-gradient text-black font-bold h-10 px-4 rounded-lg text-sm hover:opacity-90 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Log Trade Instead
          </button>
        </div>

        <QuickTradeEntry isOpen={showQuickTrade} onClose={handleQuickTradeClose} />
      </div>
    )
  }

  // Not checked in yet
  return (
    <div className="p-6 rounded-2xl glass-surface">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[var(--gold)]">local_fire_department</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">
                {streakData.currentStreak > 0 ? `${streakData.currentStreak} day streak` : 'Start your streak'}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)]">Did you trade today?</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowQuickTrade(true)}
            className="gold-gradient text-black font-bold h-10 px-5 rounded-lg text-sm hover:opacity-90 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Yes, log trade
          </button>
          <button
            onClick={handleNoTradeToday}
            disabled={isSubmitting}
            className="h-10 px-5 rounded-lg btn-glass text-sm font-semibold hover:bg-black/5 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">bedtime</span>
            )}
            No trades today
          </button>
        </div>
      </div>

      {streakData.restDaysAvailable > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
          <span className="material-symbols-outlined text-sm">info</span>
          <span>
            {streakData.restDaysAvailable} rest day{streakData.restDaysAvailable !== 1 ? 's' : ''} available this week - your streak is protected
          </span>
        </div>
      )}

      <QuickTradeEntry isOpen={showQuickTrade} onClose={handleQuickTradeClose} />
    </div>
  )
}
