'use client'

import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

// Singleton supabase client for auth operations
let supabaseClient: ReturnType<typeof createClient> | null = null

// Use sessionStorage to track initialization across page loads
// This ensures fresh auth check on hard refresh while avoiding duplicate calls
const AUTH_INIT_KEY = 'auth_init_timestamp'
const AUTH_STALE_MS = 5 * 60 * 1000 // Consider stale after 5 minutes

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

function shouldReinitialize(): boolean {
  if (typeof window === 'undefined') return true

  const lastInit = sessionStorage.getItem(AUTH_INIT_KEY)
  if (!lastInit) return true

  const elapsed = Date.now() - parseInt(lastInit, 10)
  // If page was loaded fresh (elapsed would be large or NaN), reinitialize
  return isNaN(elapsed) || elapsed > AUTH_STALE_MS
}

function markInitialized() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(AUTH_INIT_KEY, Date.now().toString())
  }
}

function clearInitialized() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(AUTH_INIT_KEY)
  }
}

export function useAuth() {
  const router = useRouter()
  const { user, profile, isLoading, setUser, setProfile, setIsLoading, reset } = useAuthStore()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const initializingRef = useRef(false)

  // Separate effect for auth state subscription - runs once on mount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION — initAuth() already handles initial load
        // This prevents a duplicate profile fetch on every page load
        if (event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
          if (session?.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single()
            setProfile(profileData)
          }
          markInitialized()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          clearInitialized()
          router.push('/auth/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, setUser, setProfile, router])

  // Separate effect for initial auth check and visibility handling
  useEffect(() => {
    // Skip if currently initializing (prevent duplicate calls in same render)
    if (initializingRef.current) {
      return
    }

    // Check if we need to reinitialize
    if (!shouldReinitialize()) {
      return
    }

    initializingRef.current = true

    const initAuth = async () => {
      // Only show loading spinner if there's no cached user (initial load)
      // On revalidation, keep existing data visible (background refresh)
      const hasExistingData = useAuthStore.getState().user !== null
      if (!hasExistingData) {
        setIsLoading(true)
      }
      try {

        // First check if there's a session (doesn't throw if missing)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Auth getSession error:', sessionError)
          setUser(null)
          setProfile(null)
          return
        }

        // If no session, user is not logged in
        if (!session) {
          setUser(null)
          setProfile(null)
          return
        }

        // Session exists, get user data
        const authUser = session.user
        setUser(authUser)

        if (authUser) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single()

          if (profileError) {
            console.error('Profile fetch error:', profileError)
          }
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setIsLoading(false)
        markInitialized()
        initializingRef.current = false
      }
    }

    initAuth()

    // Handle tab visibility change - recheck auth when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear the timestamp so next render will recheck
        clearInitialized()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [supabase, setUser, setProfile, setIsLoading])

  const signUp = useCallback(async (email: string, password: string, role: 'student' | 'teacher' = 'student') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    })

    if (error) throw error

    // Update profile role if teacher
    if (data.user && role === 'teacher') {
      await supabase
        .from('profiles')
        .update({ role: 'teacher' })
        .eq('user_id', data.user.id)
    }

    return data
  }, [supabase])

  const signIn = useCallback(async (email: string, password: string) => {
    // Clear initialization state for fresh login
    clearInitialized()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }, [supabase])

  const signOut = useCallback(async () => {
    clearInitialized()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    reset()
    router.push('/auth/login')
  }, [supabase, reset, router])

  return {
    user,
    profile,
    isLoading,
    signUp,
    signIn,
    signOut,
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    isPremium: profile?.subscription_tier === 'premium',
  }
}
