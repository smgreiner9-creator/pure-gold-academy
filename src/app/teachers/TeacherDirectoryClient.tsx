'use client'

import { useState } from 'react'
import TeacherProfileCard from '@/components/teacher/TeacherProfileCard'

interface TeacherStat {
  teacher: {
    id: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    slug: string | null
    role: string
  }
  classroomCount: number
  studentCount: number
  avgRating: number
  reviewCount: number
  hasTrackRecord: boolean
}

export default function TeacherDirectoryClient({
  teacherStats,
}: {
  teacherStats: TeacherStat[]
}) {
  const [search, setSearch] = useState('')

  const filtered = teacherStats.filter((ts) => {
    if (!search) return true
    const q = search.toLowerCase()
    const nameMatch = ts.teacher.display_name?.toLowerCase().includes(q)
    const bioMatch = ts.teacher.bio?.toLowerCase().includes(q)
    return nameMatch || bioMatch
  })

  return (
    <>
      {/* Search Bar */}
      <div className="max-w-lg mx-auto mb-10">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl input-field text-white placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ts) => (
            <TeacherProfileCard
              key={ts.teacher.id}
              teacher={ts.teacher}
              classroomCount={ts.classroomCount}
              studentCount={ts.studentCount}
              avgRating={ts.avgRating}
              reviewCount={ts.reviewCount}
              hasTrackRecord={ts.hasTrackRecord}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-3 block">
            search_off
          </span>
          <p className="text-[var(--muted)]">No teachers match your search.</p>
        </div>
      )}
    </>
  )
}
