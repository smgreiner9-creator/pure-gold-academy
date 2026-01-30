'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import type { JournalEntry } from '@/types/database'

// Lazy-loaded analytics components
const EquityCurve = dynamic(() => import('@/components/analytics/EquityCurve').then(m => ({ default: m.EquityCurve })), { ssr: false })
const EmotionCorrelation = dynamic(() => import('@/components/analytics/EmotionCorrelation').then(m => ({ default: m.EmotionCorrelation })), { ssr: false })
const InstrumentPerformance = dynamic(() => import('@/components/analytics/InstrumentPerformance').then(m => ({ default: m.InstrumentPerformance })), { ssr: false })
const TimeAnalysis = dynamic(() => import('@/components/analytics/TimeAnalysis').then(m => ({ default: m.TimeAnalysis })), { ssr: false })
const RuleAdherence = dynamic(() => import('@/components/analytics/RuleAdherence').then(m => ({ default: m.RuleAdherence })), { ssr: false })
const PsychologyAnalysis = dynamic(() => import('@/components/analytics/PsychologyAnalysis').then(m => ({ default: m.PsychologyAnalysis })), { ssr: false })
const InsightsTab = dynamic(() => import('@/components/analytics/InsightsTab').then(m => ({ default: m.InsightsTab })), { ssr: false })

type TabType = 'overview' | 'performance' | 'psychology' | 'patterns'

export default function AnalyticsPage() {
  const router = useRouter()
  const { profile, isPremium, isLoading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Redirect non-premium users
  useEffect(() => {
    if (!authLoading && !isPremium) {
      router.push('/settings/subscription')
    }
  }, [authLoading, isPremium, router])

  // Fetch all journal entries
  useEffect(() => {
    async function fetchEntries() {
      if (!profile?.id) return

      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', profile.id)
          .order('trade_date', { ascending: true })

        if (error) throw error
        setEntries(data || [])
      } catch (err) {
        console.error('Error fetching entries:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (profile?.id && isPremium) {
      fetchEntries()
    }
  }, [profile?.id, isPremium, supabase])

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'monitoring' },
    { key: 'performance', label: 'Performance', icon: 'candlestick_chart' },
    { key: 'psychology', label: 'Psychology', icon: 'neurology' },
    { key: 'patterns', label: 'Patterns', icon: 'lightbulb' },
  ]

  if (authLoading || (!isPremium && !authLoading)) {
    return (
      <div className="content-grid">
        <div className="col-span-full animate-pulse space-y-4">
          <div className="h-8 skeleton-glass rounded w-1/3" />
          <div className="h-64 skeleton-glass rounded" />
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Insights"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabType)}
      />

      <div className="content-grid">
        <div className="col-span-full">
          <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabType)} />
        </div>

      {/* Content */}
      {isLoading ? (
        <div className="col-span-full p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-[var(--gold)]">
            progress_activity
          </span>
          <p className="text-[var(--muted)] mt-4">Loading your analytics...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="col-span-full glass-surface p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">analytics</span>
          </div>
          <h2 className="text-xl font-bold mb-2">No Data Yet</h2>
          <p className="text-[var(--muted)] mb-6">
            Start logging trades to see your analytics and insights.
          </p>
          <Link
            href="/journal/new"
            className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm"
          >
            <span className="material-symbols-outlined">add</span>
            Log Your First Trade
          </Link>
        </div>
      ) : (
        <>
          {/* ── Overview Tab: Dashboard grid ── */}
          {activeTab === 'overview' && (
            <>
              <div className="col-span-full"><EquityCurve entries={entries} /></div>
              <EmotionCorrelation entries={entries} />
              <InstrumentPerformance entries={entries} />
              <div className="col-span-full"><InsightsTab entries={entries} /></div>
            </>
          )}

          {/* ── Performance Tab ── */}
          {activeTab === 'performance' && (
            <>
              <div className="col-span-full"><EquityCurve entries={entries} /></div>
              <div className="col-span-full"><InstrumentPerformance entries={entries} expanded /></div>
              <div className="col-span-full"><TimeAnalysis entries={entries} /></div>
            </>
          )}

          {/* ── Psychology Tab ── */}
          {activeTab === 'psychology' && (
            <>
              <div className="col-span-full"><EmotionCorrelation entries={entries} expanded /></div>
              <div className="col-span-full"><PsychologyAnalysis entries={entries} /></div>
              <div className="col-span-full"><RuleAdherence entries={entries} /></div>
            </>
          )}

          {/* ── Patterns Tab ── */}
          {activeTab === 'patterns' && (
            <div className="col-span-full"><InsightsTab entries={entries} /></div>
          )}
        </>
      )}
      </div>
    </>
  )
}
