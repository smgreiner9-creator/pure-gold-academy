'use client'

import Link from 'next/link'
import { JournalList } from '@/components/journal/JournalList'
import { MiniStatsBar } from '@/components/journal/MiniStatsBar'
import { useAuth } from '@/hooks/useAuth'

export default function JournalPage() {
  const { isPremium } = useAuth()

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Journal</h1>
        <div className="flex items-center gap-2">
          {isPremium && (
            <Link
              href="/journal/analytics"
              className="h-9 px-3 rounded-lg border border-[var(--card-border)] text-[var(--muted)] font-medium flex items-center gap-1.5 hover:text-white hover:border-[var(--gold)]/30 transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              Stats
            </Link>
          )}
          <Link
            href="/journal/new"
            className="gold-gradient text-black font-bold h-9 px-4 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New
          </Link>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <MiniStatsBar />

      {/* Journal Entries */}
      <JournalList />
    </div>
  )
}
