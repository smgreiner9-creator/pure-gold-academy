'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import type { TeacherStripeAccount } from '@/types/database'

interface TeacherStripeState {
  stripeAccount: TeacherStripeAccount | null
  isConnected: boolean
  isOnboardingComplete: boolean
  canAcceptPayments: boolean
  isLoading: boolean
  error: string | null
}

export function useTeacherStripe() {
  const { profile } = useAuth()
  const [state, setState] = useState<TeacherStripeState>({
    stripeAccount: null,
    isConnected: false,
    isOnboardingComplete: false,
    canAcceptPayments: false,
    isLoading: true,
    error: null,
  })
  const supabase = useMemo(() => createClient(), [])

  const loadStripeAccount = useCallback(async () => {
    if (!profile?.id) return

    try {
      const { data: stripeAccount } = await supabase
        .from('teacher_stripe_accounts')
        .select('*')
        .eq('teacher_id', profile.id)
        .single()

      const isConnected = !!stripeAccount?.stripe_account_id
      const isOnboardingComplete = stripeAccount?.onboarding_complete === true
      const canAcceptPayments = stripeAccount?.charges_enabled === true

      setState({
        stripeAccount,
        isConnected,
        isOnboardingComplete,
        canAcceptPayments,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error loading Stripe account:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load Stripe account',
      }))
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id && profile?.role === 'teacher') {
      loadStripeAccount()
    } else {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [profile?.id, profile?.role, loadStripeAccount])

  const startOnboarding = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to get onboarding URL')
      }
    } catch (error) {
      console.error('Error starting onboarding:', error)
      throw error
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/connect/status')
      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setState(prev => ({
        ...prev,
        isConnected: data.connected,
        isOnboardingComplete: data.onboarding_complete,
        canAcceptPayments: data.charges_enabled,
      }))

      // Also refresh from database
      await loadStripeAccount()
    } catch (error) {
      console.error('Error refreshing status:', error)
    }
  }, [loadStripeAccount])

  return {
    ...state,
    startOnboarding,
    refresh: refreshStatus,
  }
}
