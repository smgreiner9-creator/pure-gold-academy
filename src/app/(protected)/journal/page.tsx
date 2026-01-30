'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { QuickEntryBar } from '@/components/journal/QuickEntryBar'
import { MiniStatsBar } from '@/components/journal/MiniStatsBar'
import { PulseSection } from '@/components/journal/PulseSection'
import { CalendarHeatmap } from '@/components/journal/CalendarHeatmap'
import { MilestoneToast } from '@/components/onboarding/MilestoneToast'
import { PreviousTradeCard } from '@/components/journal/PreviousTradeCard'
import { JournalList } from '@/components/journal/JournalList'
import { PageHeader } from '@/components/layout/PageHeader'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { useJournalStatsStore } from '@/store/journalStats'
import LevelProgressBar from '@/components/onboarding/LevelProgressBar'
import UnlockModal from '@/components/onboarding/UnlockModal'
import ConsistencyScoreWidget from '@/components/journal/ConsistencyScoreWidget'
import { WeeklyReview } from '@/components/journal/WeeklyReview'
import { PlaybookView } from '@/components/journal/PlaybookView'
import { ProgressiveGate } from '@/components/onboarding/ProgressiveGate'
import { useProgressiveLevel } from '@/hooks/useProgressiveLevel'
import type { OnboardingState } from '@/types/database'

export default function JournalPage() {
  const { profile } = useAuth()
  const [view, setView] = useState<'trades' | 'playbook' | 'history'>('trades')
  const [refreshKey, setRefreshKey] = useState(0)
  const { stats: cachedStats } = useJournalStatsStore()
  const { level: currentLevel, nextLevel, justLeveledUp, dismissLevelUp } = useProgressiveLevel()

  const onboarding = profile?.onboarding_state as OnboardingState | null
  const tradesLogged = Math.max(onboarding?.trades_logged ?? 0, cachedStats?.totalTrades ?? 0)

  const tabs = [
    { key: 'trades', label: 'Trades', icon: 'list' },
    { key: 'playbook', label: 'Playbook', icon: 'auto_stories' },
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

  return (
    <>
      <PageHeader
        title="Journal"
        tabs={tabs}
        activeTab={view}
        onTabChange={(key) => setView(key as 'trades' | 'playbook' | 'history')}
        stats={headerStats}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/journal/import"
              className="btn-glass h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span className="hidden sm:inline">Import</span>
            </Link>
            <Link
              href="/journal/new"
              className="btn-gold h-9 px-4 rounded-lg flex items-center gap-1.5 text-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="hidden sm:inline">New Entry</span>
            </Link>
          </div>
        }
      />

      <div className="content-grid">
        <div className="col-span-full">
          <MobileTabBar tabs={tabs} activeTab={view} onTabChange={(key) => setView(key as 'trades' | 'playbook' | 'history')} />
        </div>

        {/* Trades Tab — always mounted, hidden when not active */}
        <div className={`col-span-full space-y-4 ${view !== 'trades' ? 'hidden' : ''}`}>
          <MilestoneToast tradesLogged={tradesLogged} />
          <LevelProgressBar />
          <WeeklyReview />

          {/* Hero Stats + Pulse */}
          <div className="glass-elevated p-5 space-y-4">
            <MiniStatsBar />
            <PulseSection />
          </div>

          {/* Consistency Score Widget */}
          {tradesLogged >= 7 && <ConsistencyScoreWidget />}

          {/* Quick Log + Previous Trade — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-surface p-5">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3">Quick Log</h3>
              <QuickEntryBar onEntryCreated={() => setRefreshKey(k => k + 1)} />
            </div>
            <PreviousTradeCard refreshKey={refreshKey} />
          </div>

          {/* Calendar Heatmap */}
          <CalendarHeatmap />
        </div>

        {/* Playbook Tab — always mounted, hidden when not active */}
        <div className={`col-span-full ${view !== 'playbook' ? 'hidden' : ''}`}>
          <ProgressiveGate onboardingState={onboarding ? { ...onboarding, trades_logged: tradesLogged } : null} level={4} featureLabel="Playbook">
            <PlaybookView />
          </ProgressiveGate>
        </div>

        {/* History Tab — always mounted, hidden when not active */}
        <div className={`col-span-full ${view !== 'history' ? 'hidden' : ''}`}>
          <JournalList />
        </div>
      </div>

      {justLeveledUp && (
        <UnlockModal level={currentLevel} nextLevel={nextLevel} onClose={dismissLevelUp} />
      )}
    </>
  )
}

