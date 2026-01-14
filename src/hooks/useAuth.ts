'use client'

import { useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

// Singleton supabase client for auth operations
let supabaseClient: ReturnType<typeof createClient> | null = null
let authInitialized = false
let authInitializing = false

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

export function useAuth() {
  const router = useRouter()
  const { user, profile, isLoading, setUser, setProfile, setIsLoading, reset } = useAuthStore()
  const supabase = useMemo(() => getSupabaseClient(), [])

  useEffect(() => {
    // Skip if already initialized or currently initializing
    if (authInitialized || authInitializing) {
      return
    }

    authInitializing = true

    const initAuth = async () => {
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
          console.log('No active session')
          setUser(null)
          setProfile(null)
          return
        }

        // Session exists, get user data
        const authUser = session.user
        console.log('Auth user:', authUser?.id, authUser?.email)
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
          console.log('Profile data:', profileData)
          setProfile(profileData)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setIsLoading(false)
        authInitialized = true
        authInitializing = false
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          authInitialized = false
          router.push('/auth/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, setUser, setProfile, setIsLoading, router])

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
    // Reset initialization state for fresh login
    authInitialized = false

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }, [supabase])

  const signOut = useCallback(async () => {
    authInitialized = false
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
