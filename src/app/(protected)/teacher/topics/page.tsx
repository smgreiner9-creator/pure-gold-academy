'use client'

import Link from 'next/link'
import { TopicsList } from '@/components/teacher/TopicsList'
import { PageHeader } from '@/components/layout/PageHeader'

export default function TopicsPage() {
  return (
    <>
      <PageHeader
        title="My Topics"
        subtitle="Organize your lessons by topic"
        action={
          <Link
            href="/teacher/lessons/new"
            className="btn-gold h-9 px-4 rounded-lg flex items-center gap-1.5 text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="hidden sm:inline">Add Lesson</span>
          </Link>
        }
      />

      <div className="content-grid-narrow">
        <TopicsList />
      </div>
    </>
  )
}
