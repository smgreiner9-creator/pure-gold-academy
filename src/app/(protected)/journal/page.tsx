'use client'

import Link from 'next/link'
import { JournalList } from '@/components/journal/JournalList'
import { JournalStats } from '@/components/journal/JournalStats'
import { JournalUsageCard } from '@/components/journal/JournalUsageCard'
import { StreakBadges } from '@/components/dashboard/StreakBadges'
import { useAuth } from '@/hooks/useAuth'

export default function JournalPage() {
  const { isPremium } = useAuth()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trade Journal</h1>
          <p className="text-[var(--muted)] text-sm">Document and review your trades</p>
        </div>
        <div className="flex items-center gap-2">
          {isPremium && (
            <Link
              href="/journal/analytics"
              className="h-10 px-4 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 text-[var(--gold)] font-semibold flex items-center gap-2 hover:bg-[var(--gold)]/10 transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              Analytics
            </Link>
          )}
          <Link
            href="/journal/new"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all gold-glow text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Entry
          </Link>
        </div>
      </div>

      {/* Monthly Usage (Free tier) */}
      <JournalUsageCard />

      {/* Achievements & Streak */}
      <StreakBadges />

      {/* Analytics Section */}
      <JournalStats />

      {/* Journal Entries */}
      <JournalList />
    </div>
  )
}
