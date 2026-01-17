'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { LearnContent, ContentPurchase, ClassroomSubscription } from '@/types/database'

interface ContentAccessResult {
  hasAccess: boolean
  reason: 'free' | 'classroom_subscription' | 'purchased' | 'premium' | 'no_access'
  purchase: ContentPurchase | null
}

interface ContentAccessState {
  accessMap: Map<string, ContentAccessResult>
  isLoading: boolean
  error: string | null
}

export function useContentAccess(classroomId: string | null) {
  const { profile, isPremium } = useAuth()
  const [state, setState] = useState<ContentAccessState>({
    accessMap: new Map(),
    isLoading: true,
    error: null,
  })
  const [classroomSubscription, setClassroomSubscription] = useState<ClassroomSubscription | null>(null)
  const [purchases, setPurchases] = useState<ContentPurchase[]>([])
  const supabase = useMemo(() => createClient(), [])

  const loadAccessData = useCallback(async () => {
    if (!profile?.id || !classroomId) return

    try {
      // Load classroom subscription and content purchases in parallel
      const [subRes, purchasesRes] = await Promise.all([
        supabase
          .from('classroom_subscriptions')
          .select('*')
          .eq('student_id', profile.id)
          .eq('classroom_id', classroomId)
          .eq('status', 'active')
          .single(),
        supabase
          .from('content_purchases')
          .select('*')
          .eq('student_id', profile.id)
          .eq('status', 'completed')
      ])

      setClassroomSubscription(subRes.data)
      setPurchases(purchasesRes.data || [])
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      console.error('Error loading access data:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load access data',
      }))
    }
  }, [profile, classroomId, supabase])

  useEffect(() => {
    if (profile?.id && classroomId) {
      // Use queueMicrotask to defer execution and satisfy React 19 compiler
      queueMicrotask(loadAccessData)
    }
  }, [profile, classroomId, loadAccessData])

  // Compute effective loading state - if we don't have required data, we're not loading
  const effectiveLoading = !!(profile?.id && classroomId) && state.isLoading

  const checkContentAccess = useCallback((content: LearnContent): ContentAccessResult => {
    // Check 1: Content is free (not individually priced)
    if (!content.is_individually_priced || content.price === 0) {
      // But check if it's premium-only
      if (content.is_premium && !isPremium) {
        return {
          hasAccess: false,
          reason: 'no_access',
          purchase: null,
        }
      }
      return {
        hasAccess: true,
        reason: 'free',
        purchase: null,
      }
    }

    // Check 2: Has active classroom subscription (grants access to all content)
    if (classroomSubscription) {
      return {
        hasAccess: true,
        reason: 'classroom_subscription',
        purchase: null,
      }
    }

    // Check 3: Has purchased this specific content
    const purchase = purchases.find(p => p.content_id === content.id)
    if (purchase) {
      return {
        hasAccess: true,
        reason: 'purchased',
        purchase,
      }
    }

    // Check 4: Is premium user and content is premium (but not individually priced)
    if (isPremium && content.is_premium) {
      return {
        hasAccess: true,
        reason: 'premium',
        purchase: null,
      }
    }

    // No access
    return {
      hasAccess: false,
      reason: 'no_access',
      purchase: null,
    }
  }, [classroomSubscription, purchases, isPremium])

  return {
    ...state,
    isLoading: effectiveLoading,
    classroomSubscription,
    purchases,
    checkContentAccess,
    refresh: loadAccessData,
  }
}

// Simple hook to check a single content item
export function useSingleContentAccess(contentId: string | null) {
  const { profile, isPremium } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [purchase, setPurchase] = useState<ContentPurchase | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const checkAccess = useCallback(async () => {
    if (!profile?.id || !contentId) return

    try {
      // Get content info
      const { data: content } = await supabase
        .from('learn_content')
        .select('*, classroom_id')
        .eq('id', contentId)
        .single()

      if (!content) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      // Check if content is free
      if (!content.is_individually_priced || content.price === 0) {
        if (content.is_premium && !isPremium) {
          setHasAccess(false)
        } else {
          setHasAccess(true)
        }
        setIsLoading(false)
        return
      }

      // Check for classroom subscription
      const { data: subscription } = await supabase
        .from('classroom_subscriptions')
        .select('*')
        .eq('student_id', profile.id)
        .eq('classroom_id', content.classroom_id)
        .eq('status', 'active')
        .single()

      if (subscription) {
        setHasAccess(true)
        setIsLoading(false)
        return
      }

      // Check for content purchase
      const { data: purchaseData } = await supabase
        .from('content_purchases')
        .select('*')
        .eq('student_id', profile.id)
        .eq('content_id', contentId)
        .eq('status', 'completed')
        .single()

      if (purchaseData) {
        setHasAccess(true)
        setPurchase(purchaseData)
        setIsLoading(false)
        return
      }

      setHasAccess(false)
      setIsLoading(false)
    } catch (error) {
      console.error('Error checking content access:', error)
      setHasAccess(false)
      setIsLoading(false)
    }
  }, [profile, contentId, isPremium, supabase])

  useEffect(() => {
    if (profile?.id && contentId) {
      // Use queueMicrotask to defer execution and satisfy React 19 compiler
      queueMicrotask(checkAccess)
    }
  }, [profile, contentId, checkAccess])

  // Compute effective loading state - if we don't have required data, we're not loading
  const effectiveLoading = !!(profile?.id && contentId) && isLoading

  return {
    hasAccess,
    isLoading: effectiveLoading,
    purchase,
    refresh: checkAccess,
  }
}
