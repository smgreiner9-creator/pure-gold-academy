'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface AdherenceData {
  tradeCallId: string
  instrument: string
  direction: string
  totalFollows: number
  journaledCount: number
  adherenceRate: number
  publishedAt: string
}

interface TradeCallAdherenceProps {
  classroomId: string
}

export function TradeCallAdherence({ classroomId }: TradeCallAdherenceProps) {
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<AdherenceData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Get recent trade calls for this classroom
      const { data: calls } = await supabase
        .from('trade_calls')
        .select('id, instrument, direction, published_at')
        .eq('classroom_id', classroomId)
        .order('published_at', { ascending: false })
        .limit(10)

      if (!calls || calls.length === 0) {
        setIsLoading(false)
        return
      }

      const adherenceRows: AdherenceData[] = []

      for (const call of calls) {
        // Count follows
        const { count: followCount } = await supabase
          .from('trade_call_follows')
          .select('*', { count: 'exact', head: true })
          .eq('trade_call_id', call.id)

        // Count follows that have a linked journal entry
        const { data: follows } = await supabase
          .from('trade_call_follows')
          .select('journal_entry_id')
          .eq('trade_call_id', call.id)
          .not('journal_entry_id', 'is', null)

        const total = followCount ?? 0
        const journaled = follows?.length ?? 0

        adherenceRows.push({
          tradeCallId: call.id,
          instrument: call.instrument,
          direction: call.direction,
          totalFollows: total,
          journaledCount: journaled,
          adherenceRate: total > 0 ? journaled / total : 0,
          publishedAt: call.published_at,
        })
      }

      setData(adherenceRows)
      setIsLoading(false)
    }

    load()
  }, [classroomId, supabase])

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl glass-surface">
        <div className="h-6 bg-black/5 rounded w-1/3 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-black/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) return null

  const avgAdherence = data.filter((d) => d.totalFollows > 0).length > 0
    ? data.filter((d) => d.totalFollows > 0).reduce((s, d) => s + d.adherenceRate, 0) /
      data.filter((d) => d.totalFollows > 0).length
    : 0

  return (
    <div className="p-6 rounded-2xl glass-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
          Trade Call Adherence
        </h3>
        <span className={`text-sm font-bold ${avgAdherence >= 0.5 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
          {Math.round(avgAdherence * 100)}% avg journal rate
        </span>
      </div>

      <div className="space-y-2">
        {data.map((row) => (
          <div
            key={row.tradeCallId}
            className="flex items-center justify-between p-3 rounded-xl glass-surface"
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                row.direction === 'long'
                  ? 'bg-[var(--success)]/10 text-[var(--success)]'
                  : 'bg-[var(--danger)]/10 text-[var(--danger)]'
              }`}>
                {row.direction.toUpperCase()}
              </span>
              <span className="text-sm font-bold">{row.instrument}</span>
              <span className="text-xs text-[var(--muted)]">
                {new Date(row.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-[var(--muted)]">
                  {row.journaledCount}/{row.totalFollows} journaled
                </p>
                {row.totalFollows > 0 && (
                  <div className="w-20 h-1.5 bg-black/5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        row.adherenceRate >= 0.7 ? 'bg-[var(--success)]' : row.adherenceRate >= 0.4 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                      }`}
                      style={{ width: `${Math.round(row.adherenceRate * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <Link
                href={`/teacher/trade-calls`}
                className="material-symbols-outlined text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition-colors"
              >
                chevron_right
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
