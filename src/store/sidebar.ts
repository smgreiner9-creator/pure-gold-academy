import { create } from 'zustand'

const SIDEBAR_EXPANDED_KEY = 'pg_sidebar_expanded'

function getPersistedExpanded(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === 'true'
}

interface SidebarState {
  isExpanded: boolean
  toggleExpand: () => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isExpanded: getPersistedExpanded(),
  toggleExpand: () => {
    const next = !get().isExpanded
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next))
    }
    set({ isExpanded: next })
  },
}))
