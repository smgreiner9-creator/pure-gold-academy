'use client'

import { type ReactNode } from 'react'

interface Tab {
  key: string
  label: string
  icon?: string
}

interface Stat {
  label: string
  value: string | number
  color?: string
  icon?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  tabs?: Tab[]
  activeTab?: string
  onTabChange?: (key: string) => void
  stats?: Stat[]
  action?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  stats,
  action,
}: PageHeaderProps) {
  return (
    <header className="border-b border-black/[0.06] bg-[#F5F5F7] sticky top-0 z-10">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        {/* Top row: title + stats + action */}
        <div className="flex items-center justify-between h-14 md:h-16 gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[var(--muted)] hidden md:block">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Inline stats */}
            {stats && stats.length > 0 && (
              <div className="hidden sm:flex items-center gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {stat.icon && (
                      <span className={`material-symbols-outlined text-sm ${stat.color || 'text-[var(--muted)]'}`}>
                        {stat.icon}
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
                      {stat.label}
                    </span>
                    <span className={`mono-num text-sm font-bold ${stat.color || 'text-[var(--foreground)]'}`}>
                      {stat.value}
                    </span>
                    {i < stats.length - 1 && (
                      <span className="w-px h-4 bg-black/[0.08] ml-2" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {action}
          </div>
        </div>

        {/* Tab row (desktop) */}
        {tabs && tabs.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`tab-underline flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'text-[var(--gold)] tab-underline-active'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.icon && (
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
