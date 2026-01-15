'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { JournalEntry } from '@/types/database'

// Analytics components
import { EquityCurve } from '@/components/analytics/EquityCurve'
import { EmotionCorrelation } from '@/components/analytics/EmotionCorrelation'
import { InstrumentPerformance } from '@/components/analytics/InstrumentPerformance'
import { TimeAnalysis } from '@/components/analytics/TimeAnalysis'
import { RuleAdherence } from '@/components/analytics/RuleAdherence'

type TabType = 'overview' | 'emotions' | 'instruments' | 'time' | 'rules'

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
    { key: 'emotions', label: 'Emotions', icon: 'psychology' },
    { key: 'instruments', label: 'Instruments', icon: 'candlestick_chart' },
    { key: 'time', label: 'Time', icon: 'schedule' },
    { key: 'rules', label: 'Rules', icon: 'checklist' },
  ]

  if (authLoading || (!isPremium && !authLoading)) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-1/3" />
          <div className="h-64 bg-white/5 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/journal"
            className="w-10 h-10 rounded-lg border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Advanced Analytics</h1>
              <span className="px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] text-xs font-bold">
                Premium
              </span>
            </div>
            <p className="text-[var(--muted)] text-sm">Deep insights into your trading performance</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-white/5 text-[var(--gold)]'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-[var(--gold)]">
            progress_activity
          </span>
          <p className="text-[var(--muted)] mt-4">Loading your analytics...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">analytics</span>
          </div>
          <h2 className="text-xl font-bold mb-2">No Data Yet</h2>
          <p className="text-[var(--muted)] mb-6">
            Start logging trades to see your analytics and insights.
          </p>
          <Link
            href="/journal/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">add</span>
            Log Your First Trade
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <EquityCurve entries={entries} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EmotionCorrelation entries={entries} />
                <InstrumentPerformance entries={entries} />
              </div>
            </>
          )}
          {activeTab === 'emotions' && <EmotionCorrelation entries={entries} expanded />}
          {activeTab === 'instruments' && <InstrumentPerformance entries={entries} expanded />}
          {activeTab === 'time' && <TimeAnalysis entries={entries} />}
          {activeTab === 'rules' && <RuleAdherence entries={entries} />}
        </div>
      )}
    </div>
  )
}
