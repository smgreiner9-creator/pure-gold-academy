'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

interface PushNotificationState {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

export function usePushNotifications() {
  const { profile } = useAuth()
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window

      if (!supported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }))
        return
      }

      setState(prev => ({ ...prev, isSupported: true }))

      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setState(prev => ({
          ...prev,
          isSubscribed: !!subscription,
          isLoading: false,
        }))
      } catch (error) {
        console.error('Error checking push subscription:', error)
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    checkSupport()
  }, [])

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      return registration
    } catch (error) {
      console.error('Service worker registration failed:', error)
      return null
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!profile?.id) {
      setState(prev => ({ ...prev, error: 'Please log in to enable notifications' }))
      return false
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await registerServiceWorker()
      if (!registration) {
        throw new Error('Service worker not available')
      }

      await registration.pushManager.getSubscription().then(sub => sub?.unsubscribe())

      // For demo purposes, we're using the VAPID public key placeholder
      // In production, replace with your actual VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        // Without VAPID key, we can only enable in-app notification preference
        // Store in localStorage for now
        localStorage.setItem('push_notifications_enabled', 'true')

        setState(prev => ({
          ...prev,
          isSubscribed: true,
          isLoading: false,
        }))
        return true
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      // Save subscription endpoint in localStorage (in production, store in database)
      localStorage.setItem('push_subscription', JSON.stringify({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
      }))

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }))

      return true
    } catch (error) {
      console.error('Push subscription failed:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to enable notifications',
        isLoading: false,
      }))
      return false
    }
  }, [profile?.id, registerServiceWorker])

  const unsubscribe = useCallback(async () => {
    if (!profile?.id) return false

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Clear subscription from localStorage
      localStorage.removeItem('push_subscription')
      localStorage.removeItem('push_notifications_enabled')

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }))

      return true
    } catch (error) {
      console.error('Push unsubscribe failed:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to disable notifications',
        isLoading: false,
      }))
      return false
    }
  }, [profile?.id])

  return {
    ...state,
    subscribe,
    unsubscribe,
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}
