'use client'

interface Tab {
  key: string
  label: string
  icon?: string
}

interface MobileTabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (key: string) => void
}

export function MobileTabBar({ tabs, activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div className="sm:hidden overflow-x-auto -mx-4 px-4">
      <div className="flex items-center gap-2 py-2 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20'
                : 'text-[var(--muted)] border border-black/[0.06] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.icon && (
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            )}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
