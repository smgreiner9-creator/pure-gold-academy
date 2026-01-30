'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { calculateConsistencyScore } from '@/lib/consistencyScore'
import type { ConsistencyScoreBreakdown, JournalEntry } from '@/types/database'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CachedResult {
  score: ConsistencyScoreBreakdown
  fetchedAt: number
  userId: string
}

export function useConsistencyScore() {
  const { profile } = useAuth()
  const userId = profile?.id ?? null

  const [score, setScore] = useState<ConsistencyScoreBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const cacheRef = useRef<CachedResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isCacheValid = useCallback(
    (uid: string): boolean => {
      const cached = cacheRef.current
      if (!cached) return false
      if (cached.userId !== uid) return false
      return Date.now() - cached.fetchedAt < TTL_MS
    },
    [],
  )

  const fetchScore = useCallback(async () => {
    if (!userId) return

    // Use cache if still valid
    if (isCacheValid(userId)) {
      setScore(cacheRef.current!.score)
      return
    }

    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('journal_entries')
        .select(
          'id, user_id, instrument, direction, entry_price, exit_price, stop_loss, take_profit, position_size, r_multiple, pnl, outcome, emotion_before, rules_followed, trade_date, created_at',
        )
        .eq('user_id', userId)
        .order('trade_date', { ascending: false })
        .limit(20)

      // Bail if this request was superseded
      if (controller.signal.aborted) return

      if (error) {
        console.error('Failed to fetch journal entries for consistency score:', error)
        setIsLoading(false)
        return
      }

      const entries = (data ?? []) as JournalEntry[]
      const computed = calculateConsistencyScore(entries)

      cacheRef.current = {
        score: computed,
        fetchedAt: Date.now(),
        userId,
      }

      setScore(computed)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Consistency score fetch error:', err)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [userId, isCacheValid])

  useEffect(() => {
    fetchScore()

    return () => {
      abortRef.current?.abort()
    }
  }, [fetchScore])

  return { score, isLoading }
}
