'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TradeFilters as TradeFiltersType } from '@/hooks/useTradeFilters'

interface TradeFiltersProps {
  filters: TradeFiltersType
  setFilter: (key: keyof TradeFiltersType, value: TradeFiltersType[keyof TradeFiltersType]) => void
  resetFilters: () => void
  activeFilterCount: number
}

const OUTCOME_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'breakeven', label: 'BE' },
]

const EMOTION_OPTIONS = [
  { value: '', label: 'All Emotions' },
  { value: 'calm', label: 'Calm' },
  { value: 'confident', label: 'Confident' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'fearful', label: 'Fearful' },
  { value: 'greedy', label: 'Greedy' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'neutral', label: 'Neutral' },
]

const SETUP_TYPE_OPTIONS = [
  { value: '', label: 'All Setups' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'pullback', label: 'Pullback' },
  { value: 'reversal', label: 'Reversal' },
  { value: 'range', label: 'Range' },
  { value: 'trend_continuation', label: 'Trend Continuation' },
  { value: 'news', label: 'News' },
  { value: 'custom', label: 'Custom' },
]

const DATE_RANGE_OPTIONS = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
]

const RULES_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'followed', label: 'Followed 4+' },
  { value: 'broken', label: 'Broken' },
]

export function TradeFilters({
  filters,
  setFilter,
  resetFilters,
  activeFilterCount,
}: TradeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn-glass flex items-center gap-2 px-4 py-2 text-sm font-medium relative"
      >
        <span className="material-symbols-outlined text-[18px]">filter_list</span>
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1"
            style={{ backgroundColor: 'var(--gold)', color: 'var(--background)' }}
          >
            {activeFilterCount}
          </span>
        )}
        <span
          className="material-symbols-outlined text-[16px] transition-transform duration-200"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>

      {/* Expandable Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="glass-surface rounded-xl p-4 mt-3 space-y-4">
              {/* Row 1: Outcome Buttons + Emotion Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Outcome
                  </label>
                  <div className="flex gap-1.5">
                    {OUTCOME_OPTIONS.map(opt => {
                      const isActive = filters.outcome === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setFilter('outcome', opt.value)}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'glass-elevated'
                              : 'btn-glass'
                          }`}
                          style={
                            isActive
                              ? { color: 'var(--gold)' }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Emotion
                  </label>
                  <select
                    value={filters.emotion}
                    onChange={e => setFilter('emotion', e.target.value)}
                    className="input-field w-full text-sm"
                  >
                    {EMOTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Setup Type + Instrument */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Setup Type
                  </label>
                  <select
                    value={filters.setupType}
                    onChange={e => setFilter('setupType', e.target.value)}
                    className="input-field w-full text-sm"
                  >
                    {SETUP_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Instrument
                  </label>
                  <input
                    type="text"
                    value={filters.instrument}
                    onChange={e => setFilter('instrument', e.target.value)}
                    placeholder="e.g. XAUUSD, BTC..."
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Date Range */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  Date Range
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_RANGE_OPTIONS.map(opt => {
                    const isActive = filters.dateRange === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFilter('dateRange', opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'glass-elevated'
                            : 'btn-glass'
                        }`}
                        style={
                          isActive
                            ? { color: 'var(--gold)' }
                            : undefined
                        }
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {/* Custom date range inputs */}
                <AnimatePresence>
                  {filters.dateRange === 'custom' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>
                            From
                          </label>
                          <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={e => setFilter('dateFrom', e.target.value)}
                            className="input-field w-full text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>
                            To
                          </label>
                          <input
                            type="date"
                            value={filters.dateTo}
                            onChange={e => setFilter('dateTo', e.target.value)}
                            className="input-field w-full text-sm"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Row 4: R-Multiple Range + Rules Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    R-Multiple Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={filters.rMultipleMin}
                      onChange={e => setFilter('rMultipleMin', e.target.value)}
                      placeholder="Min"
                      className="input-field w-full text-sm mono-num"
                    />
                    <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                      —
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={filters.rMultipleMax}
                      onChange={e => setFilter('rMultipleMax', e.target.value)}
                      placeholder="Max"
                      className="input-field w-full text-sm mono-num"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Rules
                  </label>
                  <div className="flex gap-1.5">
                    {RULES_FILTER_OPTIONS.map(opt => {
                      const isActive = filters.rulesFilter === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setFilter('rulesFilter', opt.value)}
                          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'glass-elevated'
                              : 'btn-glass'
                          }`}
                          style={
                            isActive
                              ? { color: 'var(--gold)' }
                              : undefined
                          }
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Row 5: Notes Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  Notes Search
                </label>
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px]"
                    style={{ color: 'var(--muted)' }}
                  >
                    search
                  </span>
                  <input
                    type="text"
                    value={filters.notesSearch}
                    onChange={e => setFilter('notesSearch', e.target.value)}
                    placeholder="Search in trade notes..."
                    className="input-field w-full text-sm pl-9"
                  />
                </div>
              </div>

              {/* Bottom: Clear All */}
              {activeFilterCount > 0 && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={resetFilters}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
                    style={{ color: 'var(--danger)' }}
                  >
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                      Clear All Filters
                    </span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
