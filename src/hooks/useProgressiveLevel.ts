'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { useJournalStatsStore } from '@/store/journalStats'
import {
  getLevelForTrades,
  getNextLevel,
  getProgressToNextLevel,
  isFeatureUnlocked,
} from '@/lib/progressiveLevels'
import type { UnlockLevel, OnboardingState } from '@/types/database'

interface UseProgressiveLevelReturn {
  level: UnlockLevel
  nextLevel: UnlockLevel | null
  progress: { current: number; target: number; percent: number }
  justLeveledUp: boolean
  dismissLevelUp: () => void
  isUnlocked: (requiredLevel: number) => boolean
}

export function useProgressiveLevel(): UseProgressiveLevelReturn {
  const { profile } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const { stats: cachedStats } = useJournalStatsStore()

  const onboarding = profile?.onboarding_state as OnboardingState | null
  const tradesLogged = Math.max(onboarding?.trades_logged ?? 0, cachedStats?.totalTrades ?? 0)
  const storedLevel = onboarding?.current_level ?? 0

  const level = useMemo(() => getLevelForTrades(tradesLogged), [tradesLogged])
  const nextLevel = useMemo(() => getNextLevel(tradesLogged), [tradesLogged])
  const progress = useMemo(() => getProgressToNextLevel(tradesLogged), [tradesLogged])

  // The user just leveled up if the computed level exceeds the stored level
  // and we haven't dismissed the notification yet
  const justLeveledUp = level.level > storedLevel && !dismissed

  const dismissLevelUp = useCallback(async () => {
    setDismissed(true)

    // Persist the new current_level to Supabase
    if (profile?.user_id) {
      try {
        const supabase = createClient()
        const updatedOnboardingState = {
          ...(profile.onboarding_state as unknown as OnboardingState ?? {}),
          current_level: level.level,
          last_level_up_at: new Date().toISOString(),
        }

        await supabase
          .from('profiles')
          .update({ onboarding_state: updatedOnboardingState })
          .eq('user_id', profile.user_id)
      } catch (error) {
        console.error('Failed to update progressive level:', error)
      }
    }
  }, [profile, level.level])

  const isUnlocked = useCallback(
    (requiredLevel: number) => isFeatureUnlocked(tradesLogged, requiredLevel),
    [tradesLogged]
  )

  return {
    level,
    nextLevel,
    progress,
    justLeveledUp,
    dismissLevelUp,
    isUnlocked,
  }
}
