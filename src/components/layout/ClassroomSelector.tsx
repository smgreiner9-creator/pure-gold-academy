'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useActiveClassroomStore } from '@/store/activeClassroom'

export function ClassroomSelector() {
  const { profile } = useAuth()
  const { activeClassroomId, subscribedClassrooms, setActiveClassroom } = useActiveClassroomStore()
  const supabase = useMemo(() => createClient(), [])

  if (subscribedClassrooms.length < 2) return null

  const handleChange = async (classroomId: string) => {
    setActiveClassroom(classroomId)

    // Update profiles.classroom_id for backward compat
    if (profile?.id) {
      await supabase
        .from('profiles')
        .update({ classroom_id: classroomId })
        .eq('id', profile.id)
    }
  }

  return (
    <div className="px-3 py-2">
      <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1 block">
        Active Classroom
      </label>
      <select
        value={activeClassroomId || ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full input-field rounded-lg px-3 py-2 text-sm"
      >
        {subscribedClassrooms.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
