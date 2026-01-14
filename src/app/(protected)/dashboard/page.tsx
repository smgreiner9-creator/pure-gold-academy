'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PositionCalculator } from '@/components/dashboard/PositionCalculator'
import { WatchedInstruments } from '@/components/dashboard/WatchedInstruments'
import { MarketNews } from '@/components/dashboard/MarketNews'
import { ForexFactoryNews } from '@/components/dashboard/ForexFactoryNews'
import { RecentTrades } from '@/components/dashboard/RecentTrades'
import { SessionIndicator } from '@/components/dashboard/SessionIndicator'

type TabType = 'pulse' | 'news' | 'trades'

// Trading quotes for motivation - outside component to avoid recreation
const quotes = [
  '"The goal of a successful trader is to make the best trades. Money is secondary."',
  '"Plan your trade and trade your plan."',
  '"The trend is your friend until the end when it bends."',
  '"Risk comes from not knowing what you are doing."',
  '"In trading, the impossible happens about twice a year."',
]

export default function DashboardPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pulse')
  // Select quote once on initial render using useState initializer
  const [randomQuote] = useState(() => quotes[Math.floor(Math.random() * quotes.length)])

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'pulse', label: 'Pulse', icon: 'monitoring' },
    { key: 'news', label: 'News', icon: 'newspaper' },
    { key: 'trades', label: 'Trades', icon: 'history' },
  ]

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pulse':
        return (
          <>
            <SessionIndicator />
            <WatchedInstruments />
            <MarketNews />
          </>
        )
      case 'news':
        return <ForexFactoryNews />
      case 'trades':
        return <RecentTrades />
    }
  }

  return (
    <div className="flex gap-8 h-full -m-6 lg:-m-8">
      {/* Main Content - Left Side */}
      <section className="w-full lg:w-3/5 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          {/* Welcome Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
              </h1>
              <p className="text-[var(--muted)] text-xs italic opacity-80">{randomQuote}</p>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-lg border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
            </div>
          </div>

          {/* Position Calculator */}
          <PositionCalculator />

          {/* Mobile Panel - Only visible on mobile/tablet */}
          <div className="lg:hidden mt-8 space-y-6">
            {/* Tabs */}
            <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] p-1 rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
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

            {/* Tab Content */}
            <div className="space-y-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </section>

      {/* Right Panel - Desktop Only */}
      <section className="hidden lg:flex flex-col w-2/5 border-l border-[var(--card-border)] bg-black/20 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center bg-[var(--card-bg)] border-b border-[var(--card-border)] p-1 m-4 rounded-xl shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? 'bg-white/5 text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-8 pb-8">
          {renderTabContent()}
        </div>
      </section>
    </div>
  )
}
