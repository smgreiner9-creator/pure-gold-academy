'use client'

import Link from 'next/link'
import { JournalList } from '@/components/journal/JournalList'
import { JournalStats } from '@/components/journal/JournalStats'
import { StreakBadges } from '@/components/dashboard/StreakBadges'

export default function JournalPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trade Journal</h1>
          <p className="text-[var(--muted)] text-sm">Document and review your trades</p>
        </div>
        <Link
          href="/journal/new"
          className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all gold-glow text-sm w-fit"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Entry
        </Link>
      </div>

      {/* Achievements & Streak */}
      <StreakBadges />

      {/* Analytics Section */}
      <JournalStats />

      {/* Journal Entries */}
      <JournalList />
    </div>
  )
}
