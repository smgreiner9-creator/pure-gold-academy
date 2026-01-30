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
  consistencyScore: number | null
  consistencyScoreFetchedAt: number | null

  setStats: (stats: JournalStats, userId: string) => void
  invalidate: () => void
  setLoading: (loading: boolean) => void
  isStale: () => boolean
  needsFetch: (userId: string) => boolean
  setConsistencyScore: (score: number) => void
  isConsistencyScoreStale: () => boolean
}

export const useJournalStatsStore = create<JournalStatsState>((set, get) => ({
  stats: null,
  lastFetchedAt: null,
  isLoading: false,
  userId: null,
  consistencyScore: null,
  consistencyScoreFetchedAt: null,

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
      consistencyScore: null,
      consistencyScoreFetchedAt: null,
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

  setConsistencyScore: (score) =>
    set({
      consistencyScore: score,
      consistencyScoreFetchedAt: Date.now(),
    }),

  isConsistencyScoreStale: () => {
    const { consistencyScoreFetchedAt } = get()
    if (!consistencyScoreFetchedAt) return true
    return Date.now() - consistencyScoreFetchedAt > TTL_MS
  },
}))
