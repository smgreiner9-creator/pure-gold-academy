import { create } from 'zustand'

const STORAGE_KEY = 'pg_active_classroom'

interface ClassroomInfo {
  id: string
  name: string
}

interface ActiveClassroomState {
  activeClassroomId: string | null
  subscribedClassrooms: ClassroomInfo[]
  setActiveClassroom: (id: string) => void
  setSubscribedClassrooms: (classrooms: ClassroomInfo[]) => void
}

function getPersistedClassroomId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export const useActiveClassroomStore = create<ActiveClassroomState>((set) => ({
  activeClassroomId: getPersistedClassroomId(),
  subscribedClassrooms: [],
  setActiveClassroom: (id) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }
    set({ activeClassroomId: id })
  },
  setSubscribedClassrooms: (classrooms) => {
    set({ subscribedClassrooms: classrooms })
  },
}))
