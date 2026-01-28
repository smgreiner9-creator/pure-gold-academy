'use client'

import Link from 'next/link'
import { TopicsList } from '@/components/teacher/TopicsList'

export default function TopicsPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Topics</h1>
          <p className="text-[var(--muted)] text-sm mt-1">Organize your lessons by topic</p>
        </div>
        <Link
          href="/teacher/lessons/new"
          className="gold-gradient text-black font-bold h-10 px-5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Lesson
        </Link>
      </div>

      <TopicsList />
    </div>
  )
}
