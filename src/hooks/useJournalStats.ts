'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { calculateStreak } from '@/lib/streakUtils'

interface JournalStats {
  winRate: number
  journalStreak: number
  totalWithOutcome: number
}

export function useJournalStats() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<JournalStats>({
    winRate: 0,
    journalStreak: 0,
    totalWithOutcome: 0,
  })

  const loadStats = useCallback(async () => {
    const userId = profile?.id
    if (!userId) return

    try {
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

        const tradeDates = [...new Set(entries.map(e => e.trade_date))]
        const checkinDates = checkins.map(c => c.check_date)
        const streakData = calculateStreak(tradeDates, checkinDates, 1)

        setStats({
          winRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
          journalStreak: streakData.currentStreak,
          totalWithOutcome,
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [profile, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadStats()
    }
  }, [profile?.id, loadStats])

  return stats
}
