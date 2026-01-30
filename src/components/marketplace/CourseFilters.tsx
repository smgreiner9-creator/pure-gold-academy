'use client'

import { useState } from 'react'

interface CourseFiltersProps {
  onSearch: (query: string) => void
  onMarketFilter: (market: string | null) => void
  onDifficultyFilter: (difficulty: string | null) => void
  onPriceFilter: (priceType: 'all' | 'free' | 'paid') => void
  onSortChange: (sort: 'popular' | 'newest' | 'rating' | 'price_low' | 'price_high') => void
  activeMarket: string | null
  activeDifficulty: string | null
  activePriceType: 'all' | 'free' | 'paid'
  activeSort: string
}

const MARKETS = ['Forex', 'Crypto', 'Stocks', 'Commodities', 'Indices']
const PRICE_OPTIONS: { label: string; value: 'all' | 'free' | 'paid' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
]
const SORT_OPTIONS: { label: string; value: 'popular' | 'newest' | 'rating' | 'price_low' | 'price_high' }[] = [
  { label: 'Most Popular', value: 'popular' },
  { label: 'Newest', value: 'newest' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
]

export default function CourseFilters({
  onSearch,
  onMarketFilter,
  onDifficultyFilter,
  onPriceFilter,
  onSortChange,
  activeMarket,
  activeDifficulty,
  activePriceType,
  activeSort,
}: CourseFiltersProps) {
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = (value: string) => {
    setSearchValue(value)
    onSearch(value)
  }

  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl input-field text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={activeSort}
            onChange={(e) => onSortChange(e.target.value as typeof SORT_OPTIONS[number]['value'])}
            className="h-11 pl-4 pr-10 rounded-xl input-field text-[var(--foreground)] text-sm appearance-none cursor-pointer focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-[18px] pointer-events-none">
            unfold_more
          </span>
        </div>
      </div>

      {/* Filter pills row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Market filters */}
        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mr-1">
          Market
        </span>
        <button
          onClick={() => onMarketFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeMarket === null
              ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30'
              : 'bg-black/5 text-[var(--muted)] border border-transparent hover:bg-black/[0.06]'
          }`}
        >
          All
        </button>
        {MARKETS.map((market) => (
          <button
            key={market}
            onClick={() => onMarketFilter(activeMarket === market ? null : market)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeMarket === market
                ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30'
                : 'bg-black/5 text-[var(--muted)] border border-transparent hover:bg-black/[0.06]'
            }`}
          >
            {market}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--glass-surface-border)] mx-1 hidden sm:block" />

        {/* Price filters */}
        <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mr-1">
          Price
        </span>
        {PRICE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onPriceFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activePriceType === opt.value
                ? 'bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30'
                : 'bg-black/5 text-[var(--muted)] border border-transparent hover:bg-black/[0.06]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
