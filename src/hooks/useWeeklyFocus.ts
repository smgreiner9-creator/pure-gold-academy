'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { WeeklyFocus } from '@/types/database'

function getWeekStart(offset = 0): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export function useWeeklyFocus() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [currentFocus, setCurrentFocus] = useState<WeeklyFocus | null>(null)
  const [lastWeekFocus, setLastWeekFocus] = useState<WeeklyFocus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const thisWeekStart = getWeekStart(0)
  const lastWeekStart = getWeekStart(-1)

  useEffect(() => {
    if (!profile?.id) return

    const fetchFocus = async () => {
      setIsLoading(true)
      try {
        const [currentRes, lastRes] = await Promise.all([
          supabase
            .from('weekly_focus')
            .select('*')
            .eq('user_id', profile.id)
            .eq('week_start', thisWeekStart)
            .maybeSingle(),
          supabase
            .from('weekly_focus')
            .select('*')
            .eq('user_id', profile.id)
            .eq('week_start', lastWeekStart)
            .maybeSingle(),
        ])

        setCurrentFocus(currentRes.data ?? null)
        setLastWeekFocus(lastRes.data ?? null)
      } catch (error) {
        console.error('Failed to fetch weekly focus:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFocus()
  }, [profile?.id, supabase, thisWeekStart, lastWeekStart])

  const setFocus = useCallback(
    async (text: string, type: string) => {
      if (!profile?.id) return

      const payload = {
        user_id: profile.id,
        week_start: thisWeekStart,
        focus_text: text,
        focus_type: type,
      }

      if (currentFocus) {
        // Update existing
        const { data, error } = await supabase
          .from('weekly_focus')
          .update({ focus_text: text, focus_type: type })
          .eq('id', currentFocus.id)
          .select()
          .single()

        if (error) {
          console.error('Failed to update weekly focus:', error)
          return
        }
        setCurrentFocus(data)
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('weekly_focus')
          .insert(payload)
          .select()
          .single()

        if (error) {
          console.error('Failed to create weekly focus:', error)
          return
        }
        setCurrentFocus(data)
      }
    },
    [profile?.id, supabase, thisWeekStart, currentFocus]
  )

  const markReviewed = useCallback(
    async (id: string, score: number) => {
      const { data, error } = await supabase
        .from('weekly_focus')
        .update({ reviewed: true, improvement_score: score })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Failed to mark focus as reviewed:', error)
        return
      }
      setLastWeekFocus(data)
    },
    [supabase]
  )

  return {
    currentFocus,
    lastWeekFocus,
    isLoading,
    setFocus,
    markReviewed,
  }
}
