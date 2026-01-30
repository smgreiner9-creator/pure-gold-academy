'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { QuickEntryBar } from '@/components/journal/QuickEntryBar'
import { MiniStatsBar } from '@/components/journal/MiniStatsBar'
import { PulseSection } from '@/components/journal/PulseSection'
import { CalendarHeatmap } from '@/components/journal/CalendarHeatmap'
import { WeeklyDigest } from '@/components/journal/WeeklyDigest'
import { MilestoneToast } from '@/components/onboarding/MilestoneToast'
import { PreviousTradeCard } from '@/components/journal/PreviousTradeCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { useJournalStatsStore } from '@/store/journalStats'
import type { OnboardingState } from '@/types/database'

export default function JournalPage() {
  const { profile } = useAuth()
  const [view, setView] = useState<'trades' | 'history'>('trades')
  const [refreshKey, setRefreshKey] = useState(0)
  const { stats: cachedStats } = useJournalStatsStore()

  const onboarding = profile?.onboarding_state as OnboardingState | null
  const tradesLogged = onboarding?.trades_logged ?? (cachedStats?.totalTrades ?? 0)

  // Derive win/loss stats from the MiniStatsBar's zustand store (avoids duplicate query)
  const winCount = cachedStats?.wins ?? 0
  const lossCount = cachedStats?.losses ?? 0
  const totalR = cachedStats?.totalR ?? 0

  const tabs = [
    { key: 'trades', label: 'Trades', icon: 'list' },
    { key: 'history', label: 'History', icon: 'grid_view' },
  ]

  const headerStats = cachedStats && cachedStats.totalTrades > 0
    ? [
        {
          label: 'Win Rate',
          value: `${cachedStats.winRate.toFixed(1)}%`,
          color: cachedStats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]',
        },
        {
          label: 'Streak',
          value: cachedStats.streak,
          color: 'text-[var(--gold)]',
          icon: 'local_fire_department',
        },
      ]
    : undefined

  const totalWithOutcome = winCount + lossCount
  const winRateDisplay = totalWithOutcome > 0 ? ((winCount / totalWithOutcome) * 100).toFixed(1) : '0.0'

  return (
    <>
      <PageHeader
        title="Journal"
        tabs={tabs}
        activeTab={view}
        onTabChange={(key) => setView(key as 'trades' | 'history')}
        stats={headerStats}
        action={
          <Link
            href="/journal/new"
            className="btn-gold h-9 px-4 rounded-lg flex items-center gap-1.5 text-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="hidden sm:inline">New Entry</span>
          </Link>
        }
      />

      <div className="content-grid">
        <div className="col-span-full">
          <MobileTabBar tabs={tabs} activeTab={view} onTabChange={(key) => setView(key as 'trades' | 'history')} />
        </div>

        {view === 'trades' ? (
          <>
            <div className="col-span-full">
              <MilestoneToast tradesLogged={tradesLogged} />
            </div>

            <div className="col-span-full">
              <WeeklyDigest />
            </div>

            {/* Hero Stats + Pulse */}
            <div className="col-span-full glass-elevated p-5 space-y-4">
              <MiniStatsBar />
              <PulseSection />
            </div>

            {/* Win/Loss Stats Card */}
            {totalWithOutcome > 0 && (
              <div className="col-span-full glass-surface p-5">
                <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Win / Loss</h3>
                <div className="flex items-center gap-6">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg text-[var(--success)]">trending_up</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--success)]">{winCount}</p>
                      <p className="text-[10px] text-[var(--muted)] uppercase">
                        Wins ({winRateDisplay}%)
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-black/[0.06]" />
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg text-[var(--danger)]">trending_down</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--danger)]">{lossCount}</p>
                      <p className="text-[10px] text-[var(--muted)] uppercase">
                        Losses ({totalWithOutcome > 0 ? ((lossCount / totalWithOutcome) * 100).toFixed(1) : '0.0'}%)
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-black/[0.06]" />
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg text-[var(--gold)]">functions</span>
                    </div>
                    <div>
                      <p className={`text-lg font-bold mono-num ${totalR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}R
                      </p>
                      <p className="text-[10px] text-[var(--muted)] uppercase">Total R</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Log + Previous Trade — side by side */}
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-surface p-5">
                <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Quick Log</h3>
                <QuickEntryBar onEntryCreated={() => setRefreshKey(k => k + 1)} />
              </div>
              <PreviousTradeCard refreshKey={refreshKey} />
            </div>

            {/* Calendar Heatmap */}
            <div className="col-span-full">
              <CalendarHeatmap />
            </div>
          </>
        ) : (
          <div className="col-span-full">
            <FullJournalList />
          </div>
        )}
      </div>
    </>
  )
}

// Extracted to keep the main page clean — imports JournalList only when list view is active
function FullJournalList() {
  // Dynamic import to avoid loading JournalList when in heatmap view
  const { JournalList } = require('@/components/journal/JournalList')
  return <JournalList />
}
