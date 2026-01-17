'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { ClassroomSubscription, ClassroomPricing } from '@/types/database'

interface ClassroomAccessState {
  hasAccess: boolean
  isPaid: boolean
  subscription: ClassroomSubscription | null
  pricing: ClassroomPricing | null
  isLoading: boolean
  error: string | null
}

export function useClassroomAccess(classroomId: string | null) {
  const { profile } = useAuth()
  const [state, setState] = useState<ClassroomAccessState>({
    hasAccess: false,
    isPaid: false,
    subscription: null,
    pricing: null,
    isLoading: true,
    error: null,
  })
  const supabase = useMemo(() => createClient(), [])

  const checkAccess = useCallback(async () => {
    if (!profile?.id || !classroomId) return

    try {
      // Get classroom pricing
      const { data: pricing } = await supabase
        .from('classroom_pricing')
        .select('*')
        .eq('classroom_id', classroomId)
        .single()

      const isPaid = pricing?.pricing_type === 'paid' && pricing.monthly_price > 0

      // If classroom is free, user has access
      if (!isPaid) {
        setState({
          hasAccess: true,
          isPaid: false,
          subscription: null,
          pricing,
          isLoading: false,
          error: null,
        })
        return
      }

      // Check if student has active subscription
      const { data: subscription } = await supabase
        .from('classroom_subscriptions')
        .select('*')
        .eq('student_id', profile.id)
        .eq('classroom_id', classroomId)
        .eq('status', 'active')
        .single()

      const hasAccess = !!subscription

      setState({
        hasAccess,
        isPaid: true,
        subscription,
        pricing,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error checking classroom access:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check access',
      }))
    }
  }, [profile?.id, classroomId, supabase])

  useEffect(() => {
    if (!profile?.id || !classroomId) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    checkAccess()
  }, [profile?.id, classroomId, checkAccess])

  return {
    ...state,
    refresh: checkAccess,
  }
}
