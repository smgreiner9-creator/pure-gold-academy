'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SkeletonJournalEntry } from '@/components/ui/Skeleton'
import { QuickCloseModal } from '@/components/dashboard/QuickCloseModal'
import type { JournalEntry, TradeOutcome } from '@/types/database'

function exportToCSV(entries: JournalEntry[], filename: string) {
  // Define CSV headers
  const headers = [
    'Date',
    'Instrument',
    'Direction',
    'Outcome',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Position Size',
    'P&L',
    'R-Multiple',
    'Emotion Before',
    'Emotion During',
    'Emotion After',
    'Rules Followed',
    'Notes',
    'Entry Time',
    'Exit Time',
  ]

  // Convert entries to CSV rows
  const rows = entries.map(entry => [
    entry.trade_date,
    entry.instrument,
    entry.direction,
    entry.outcome || '',
    entry.entry_price,
    entry.exit_price || '',
    entry.stop_loss || '',
    entry.take_profit || '',
    entry.position_size,
    entry.pnl !== null ? entry.pnl.toFixed(2) : '',
    entry.r_multiple !== null ? entry.r_multiple.toFixed(2) : '',
    entry.emotion_before,
    entry.emotion_during || '',
    entry.emotion_after || '',
    Array.isArray(entry.rules_followed) ? entry.rules_followed.join('; ') : '',
    entry.notes ? entry.notes.replace(/"/g, '""').replace(/\n/g, ' ') : '',
    entry.entry_time || '',
    entry.exit_time || '',
  ])

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function JournalList() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [closingTrade, setClosingTrade] = useState<JournalEntry | null>(null)
  const [filter, setFilter] = useState({
    outcome: '',
    instrument: '',
    dateRange: '30',
  })
  const supabase = useMemo(() => createClient(), [])

  const loadEntries = useCallback(async () => {
    if (!profile?.id) return

    setIsLoading(true)
    try {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })

      if (filter.outcome) {
        query = query.eq('outcome', filter.outcome as TradeOutcome)
      }

      if (filter.instrument) {
        query = query.ilike('instrument', `%${filter.instrument}%`)
      }

      if (filter.dateRange !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(filter.dateRange))
        query = query.gte('trade_date', daysAgo.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Error loading entries:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter, profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadEntries()
    }
  }, [profile?.id, filter, loadEntries])

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)

      if (error) throw error
      setEntries(entries.filter(e => e.id !== id))
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const handleExport = useCallback(() => {
    if (entries.length === 0) return
    const date = new Date().toISOString().split('T')[0]
    exportToCSV(entries, `trading-journal-${date}.csv`)
  }, [entries])

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'win':
        return 'text-[var(--success)] bg-[var(--success)]/10'
      case 'loss':
        return 'text-[var(--danger)] bg-[var(--danger)]/10'
      case 'breakeven':
        return 'text-[var(--warning)] bg-[var(--warning)]/10'
      default:
        return 'text-[var(--muted)] bg-black/5'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <SkeletonJournalEntry key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 rounded-2xl glass-surface flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filter.outcome}
            onChange={(e) => setFilter(prev => ({ ...prev, outcome: e.target.value }))}
            className="input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm appearance-none cursor-pointer transition-colors min-w-[140px]"
          >
            <option value="">All Outcomes</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakeven</option>
          </select>
          <select
            value={filter.dateRange}
            onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
            className="input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm appearance-none cursor-pointer transition-colors min-w-[140px]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-glass text-sm font-medium hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export CSV
        </button>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="p-12 rounded-2xl glass-surface text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">edit_note</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No journal entries yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">Start documenting your trades to track your progress</p>
          <Link
            href="/journal/new"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            Create Your First Entry
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.id}`}
              className="block p-4 rounded-xl glass-surface hover:border-[var(--gold)]/50 transition-all"
            >
              {/* Line 1: Outcome, Instrument, Direction, Date, R-Multiple or Close button */}
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getOutcomeColor(entry.outcome)}`}>
                    {entry.outcome ? entry.outcome : 'Open'}
                  </span>
                  <span className="font-bold text-sm">{entry.instrument}</span>
                  <span className={`text-xs font-semibold ${
                    entry.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {entry.direction.toUpperCase()}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(entry.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {entry.r_multiple !== null && (
                    <span className={`mono-num text-sm font-bold ${entry.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {entry.r_multiple >= 0 ? '+' : ''}{entry.r_multiple.toFixed(1)}R
                    </span>
                  )}
                  {!entry.outcome && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setClosingTrade(entry)
                      }}
                      className="h-7 px-2.5 rounded-lg bg-[var(--gold)] text-black text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Close
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteEntry(entry.id)
                    }}
                    className="w-7 h-7 rounded-lg border border-[var(--glass-surface-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              {/* Line 2: Entry → Exit, P&L, Emotion */}
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span className="mono-num">{entry.entry_price}</span>
                {entry.exit_price && (
                  <>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    <span className="mono-num">{entry.exit_price}</span>
                  </>
                )}
                {entry.pnl !== null && (
                  <span className={`mono-num font-bold ${entry.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    ${entry.pnl.toFixed(2)}
                  </span>
                )}
                {entry.emotion_before && (
                  <span className="capitalize">{entry.emotion_before}</span>
                )}
                {entry.screenshot_urls && entry.screenshot_urls.length > 0 && (
                  <span className="flex items-center gap-1 ml-auto">
                    <span className="material-symbols-outlined text-sm">image</span>
                    {entry.screenshot_urls.length}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Close Modal */}
      {closingTrade && (
        <QuickCloseModal
          isOpen={true}
          trade={closingTrade}
          onClose={() => {
            setClosingTrade(null)
            loadEntries()
          }}
        />
      )}
    </div>
  )
}
