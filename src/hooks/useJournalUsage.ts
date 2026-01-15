'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { FREE_TIER_JOURNAL_LIMIT } from '@/lib/constants'

interface JournalUsage {
  used: number
  limit: number
  remaining: number
  isAtLimit: boolean
  isPremium: boolean
  isLoading: boolean
  percentUsed: number
}

export function useJournalUsage(): JournalUsage {
  const { profile, isPremium } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [used, setUsed] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      if (!profile?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Get the first day of current month
        const now = new Date()
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const firstOfMonthStr = firstOfMonth.toISOString()

        // Count journal entries created this month
        const { count, error } = await supabase
          .from('journal_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('created_at', firstOfMonthStr)

        if (error) {
          console.error('Error fetching journal usage:', error)
        } else {
          setUsed(count || 0)
        }
      } catch (err) {
        console.error('Error in useJournalUsage:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [profile?.id, supabase])

  const limit = isPremium ? Infinity : FREE_TIER_JOURNAL_LIMIT
  const remaining = Math.max(0, limit - used)
  const isAtLimit = !isPremium && used >= FREE_TIER_JOURNAL_LIMIT
  const percentUsed = isPremium ? 0 : Math.min(100, (used / FREE_TIER_JOURNAL_LIMIT) * 100)

  return {
    used,
    limit: isPremium ? Infinity : FREE_TIER_JOURNAL_LIMIT,
    remaining,
    isAtLimit,
    isPremium,
    isLoading,
    percentUsed,
  }
}
