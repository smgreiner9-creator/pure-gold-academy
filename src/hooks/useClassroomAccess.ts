'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useActiveClassroomStore } from '@/store/activeClassroom'
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

  const {
    activeClassroomId,
    subscribedClassrooms,
    setActiveClassroom,
    setSubscribedClassrooms,
  } = useActiveClassroomStore()

  // Load all subscriptions into the store
  const loadSubscriptions = useCallback(async () => {
    if (!profile?.id) return

    try {
      const { data: subs } = await supabase
        .from('classroom_subscriptions')
        .select('classroom_id, classrooms(id, name)')
        .eq('student_id', profile.id)
        .eq('status', 'active')

      if (subs && subs.length > 0) {
        const classrooms = subs.map(s => {
          const classroom = s.classrooms as unknown as { id: string; name: string } | null
          return {
            id: s.classroom_id,
            name: classroom?.name || 'Classroom',
          }
        })
        setSubscribedClassrooms(classrooms)

        // Auto-select: prefer persisted, then profile.classroom_id, then first subscription
        if (!activeClassroomId || !classrooms.find(c => c.id === activeClassroomId)) {
          const preferred = profile.classroom_id && classrooms.find(c => c.id === profile.classroom_id)
            ? profile.classroom_id
            : classrooms[0].id
          setActiveClassroom(preferred)
        }
      } else {
        setSubscribedClassrooms([])
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error)
    }
  }, [profile, supabase, activeClassroomId, setActiveClassroom, setSubscribedClassrooms])

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
  }, [profile, classroomId, supabase])

  useEffect(() => {
    if (profile?.id) {
      queueMicrotask(loadSubscriptions)
    }
  }, [profile?.id, loadSubscriptions])

  useEffect(() => {
    if (profile?.id && classroomId) {
      queueMicrotask(checkAccess)
    }
  }, [profile, classroomId, checkAccess])

  const effectiveLoading = !!(profile?.id && classroomId) && state.isLoading

  return {
    ...state,
    isLoading: effectiveLoading,
    activeClassroomId,
    subscribedClassrooms,
    setActiveClassroom,
    hasClassroom: subscribedClassrooms.length > 0,
    refresh: () => {
      loadSubscriptions()
      checkAccess()
    },
  }
}
