import { create } from 'zustand'
import type { Profile } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type TeacherMode = 'trading' | 'teaching'

const TEACHER_MODE_KEY = 'pg_teacher_mode'

function getPersistedTeacherMode(): TeacherMode {
  if (typeof window === 'undefined') return 'trading'
  return (localStorage.getItem(TEACHER_MODE_KEY) as TeacherMode) || 'trading'
}

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  teacherMode: TeacherMode
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setIsLoading: (isLoading: boolean) => void
  setTeacherMode: (mode: TeacherMode) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  teacherMode: getPersistedTeacherMode(),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setTeacherMode: (mode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TEACHER_MODE_KEY, mode)
    }
    set({ teacherMode: mode })
  },
  reset: () => set({ user: null, profile: null, isLoading: false, teacherMode: 'trading' }),
}))
