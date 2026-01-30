'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { calculatePlaybookStats, type SetupStats } from '@/lib/playbookUtils'
import type { JournalEntry } from '@/types/database'

const SETUP_ICONS: Record<string, string> = {
  breakout: 'north_east',
  pullback: 'south_west',
  reversal: 'swap_vert',
  range: 'width',
  trend_continuation: 'trending_up',
  news: 'newspaper',
}

function getSetupIcon(setupType: string): string {
  if (setupType.startsWith('custom:')) return 'edit'
  return SETUP_ICONS[setupType] || 'insights'
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 55) return 'var(--success)'
  if (winRate < 45) return 'var(--danger)'
  return 'var(--gold)'
}

function SkeletonCard() {
  return (
    <div className="glass-surface rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--muted)]/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 rounded bg-[var(--muted)]/10" />
          <div className="h-3 w-16 rounded bg-[var(--muted)]/10" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-[var(--muted)]/10 mb-3" />
      <div className="flex gap-4">
        <div className="h-8 w-16 rounded bg-[var(--muted)]/10" />
        <div className="h-8 w-16 rounded bg-[var(--muted)]/10" />
      </div>
    </div>
  )
}

function PlaybookCard({ stat, index }: { stat: SetupStats; index: number }) {
  const winBarWidth = stat.totalTrades > 0
    ? (stat.wins / stat.totalTrades) * 100
    : 0
  const lossBarWidth = stat.totalTrades > 0
    ? (stat.losses / stat.totalTrades) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="glass-surface rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Edge badge */}
      {stat.isEdge && (
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold gold-gradient text-[var(--background)]">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Your Edge
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            ${stat.isEdge ? 'gold-gradient' : 'bg-[var(--muted)]/10'}
          `}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ color: stat.isEdge ? 'var(--background)' : 'var(--foreground)' }}
          >
            {getSetupIcon(stat.setupType)}
          </span>
        </div>
        <div>
          <h3 className="font-semibold text-[var(--foreground)]">{stat.label}</h3>
          <p className="text-xs text-[var(--muted)]">
            {stat.totalTrades} trade{stat.totalTrades !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-baseline gap-6 mb-4">
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">Win Rate</p>
          <p
            className="text-2xl font-bold mono-num"
            style={{ color: getWinRateColor(stat.winRate) }}
          >
            {stat.winRate.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">Avg R</p>
          <p
            className="text-lg font-semibold mono-num"
            style={{
              color: stat.avgR >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {stat.avgR >= 0 ? '+' : ''}
            {stat.avgR.toFixed(2)}R
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted)] mb-0.5">Total R</p>
          <p
            className="text-lg font-semibold mono-num"
            style={{
              color: stat.totalR >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {stat.totalR >= 0 ? '+' : ''}
            {stat.totalR.toFixed(2)}R
          </p>
        </div>
      </div>

      {/* Win/Loss bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-1.5">
          <span>{stat.wins}W / {stat.losses}L / {stat.breakevens}BE</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--muted)]/10 overflow-hidden flex">
          {winBarWidth > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${winBarWidth}%` }}
              transition={{ duration: 0.6, delay: index * 0.05 + 0.2 }}
              className="h-full rounded-l-full"
              style={{ backgroundColor: 'var(--success)' }}
            />
          )}
          {lossBarWidth > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${lossBarWidth}%` }}
              transition={{ duration: 0.6, delay: index * 0.05 + 0.3 }}
              className="h-full rounded-r-full"
              style={{ backgroundColor: 'var(--danger)' }}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function PlaybookView() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<SetupStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadPlaybook = useCallback(async () => {
    if (!profile?.id) return

    try {
      setIsLoading(true)

      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })

      if (error) throw error

      // Filter client-side — column may not exist until migration runs
      const tagged = ((entries as JournalEntry[]) || []).filter(e => e.setup_type)
      const computed = calculatePlaybookStats(tagged)
      setStats(computed)
    } catch (err) {
      console.error('Failed to load playbook data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    loadPlaybook()
  }, [loadPlaybook])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Your Playbook
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="glass-surface rounded-2xl p-8 text-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--muted)] mb-3 block">
          menu_book
        </span>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          Build Your Playbook
        </h3>
        <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
          Tag your trades with setup types to build your playbook. Track which
          setups give you an edge and refine your strategy over time.
        </p>
      </div>
    )
  }

  const edgeCount = stats.filter((s) => s.isEdge).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Your Playbook
        </h2>
        {edgeCount > 0 && (
          <span className="text-xs text-[var(--gold)] font-medium">
            {edgeCount} edge{edgeCount !== 1 ? 's' : ''} identified
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <PlaybookCard key={stat.setupType} stat={stat} index={index} />
        ))}
      </div>
    </div>
  )
}
