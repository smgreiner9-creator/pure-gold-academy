import { create } from 'zustand'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

interface JournalStats {
  totalTrades: number
  winRate: number
  totalR: number
  wins: number
  losses: number
  streak: number
  streakType: 'win' | 'loss' | 'none'
}

interface JournalStatsState {
  stats: JournalStats | null
  lastFetchedAt: number | null
  isLoading: boolean
  userId: string | null

  setStats: (stats: JournalStats, userId: string) => void
  invalidate: () => void
  setLoading: (loading: boolean) => void
  isStale: () => boolean
  needsFetch: (userId: string) => boolean
}

export const useJournalStatsStore = create<JournalStatsState>((set, get) => ({
  stats: null,
  lastFetchedAt: null,
  isLoading: false,
  userId: null,

  setStats: (stats, userId) =>
    set({
      stats,
      lastFetchedAt: Date.now(),
      isLoading: false,
      userId,
    }),

  invalidate: () =>
    set({
      stats: null,
      lastFetchedAt: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  isStale: () => {
    const { lastFetchedAt } = get()
    if (!lastFetchedAt) return true
    return Date.now() - lastFetchedAt > TTL_MS
  },

  needsFetch: (userId: string) => {
    const state = get()
    if (state.isLoading) return false
    if (state.userId !== userId) return true
    return state.isStale()
  },
}))
