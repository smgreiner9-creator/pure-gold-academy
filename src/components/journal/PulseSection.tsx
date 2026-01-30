'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { getTodayInsight } from '@/components/analytics/InsightEngine'
import type { JournalEntry } from '@/types/database'

interface PulseItem {
  type: 'event' | 'trade_calls' | 'feedback' | 'pattern'
  icon: string
  label: string
  value: string
  href?: string
  color: string
}

export function PulseSection() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<PulseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    const loadPulseData = async () => {
      const pulseItems: PulseItem[] = []

      // Fire all queries in parallel
      const [tradeCallsResult, feedbackResult, entriesResult] = await Promise.all([
        // 1. Active trade calls count
        profile.classroom_id
          ? supabase
              .from('trade_calls')
              .select('*', { count: 'exact', head: true })
              .eq('classroom_id', profile.classroom_id)
              .eq('status', 'active')
          : Promise.resolve({ count: null }),
        // 2. Recent feedback
        supabase
          .from('journal_feedback')
          .select('id, journal_entry_id')
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5),
        // 3. All journal entries for insight engine
        supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', profile.id)
          .order('trade_date', { ascending: true }),
      ])

      // Process trade calls
      const count = tradeCallsResult.count
      if (count && count > 0) {
        pulseItems.push({
          type: 'trade_calls',
          icon: 'trending_up',
          label: 'Active Calls',
          value: `${count} trade call${count !== 1 ? 's' : ''} live`,
          href: '/learn',
          color: 'text-[var(--gold)]',
        })
      }

      // Process feedback
      const recentFeedback = feedbackResult.data
      if (recentFeedback && recentFeedback.length > 0) {
        pulseItems.push({
          type: 'feedback',
          icon: 'rate_review',
          label: 'Teacher Feedback',
          value: `${recentFeedback.length} feedback note${recentFeedback.length !== 1 ? 's' : ''}`,
          href: recentFeedback[0] ? `/journal/${recentFeedback[0].journal_entry_id}` : '/journal',
          color: 'text-[var(--success)]',
        })
      }

      // Process entries for pattern detection
      const allEntries = entriesResult.data

      if (allEntries && allEntries.length >= 5) {
        const todayInsight = getTodayInsight(allEntries as JournalEntry[])
        if (todayInsight) {
          const colorMap: Record<string, string> = {
            warning: 'text-[var(--warning)]',
            danger: 'text-[var(--danger)]',
            success: 'text-[var(--success)]',
            info: 'text-blue-400',
          }
          pulseItems.push({
            type: 'pattern',
            icon: todayInsight.icon,
            label: todayInsight.title,
            value: todayInsight.message,
            color: colorMap[todayInsight.severity] || 'text-[var(--muted)]',
          })
        }
      }

      // 4. Trading session indicator
      const hour = new Date().getUTCHours()
      let session = ''
      if (hour >= 22 || hour < 7) session = 'Sydney/Tokyo session active'
      else if (hour >= 7 && hour < 12) session = 'London session active'
      else if (hour >= 12 && hour < 17) session = 'New York session active'
      else if (hour >= 17 && hour < 22) session = 'Market winding down'

      if (session) {
        pulseItems.push({
          type: 'event',
          icon: 'schedule',
          label: 'Market',
          value: session,
          color: 'text-[var(--muted)]',
        })
      }

      setItems(pulseItems.slice(0, 3))
      setIsLoading(false)
    }

    loadPulseData()
  }, [profile?.id, profile?.classroom_id, supabase])

  if (isLoading || items.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto">
      {items.map((item, i) => {
        const content = (
          <div
            key={i}
            className={`glass-surface flex items-center gap-2 px-3 py-2 shrink-0 ${
              item.href ? 'glass-interactive cursor-pointer' : ''
            }`}
          >
            <span className={`material-symbols-outlined text-base ${item.color}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">{item.label}</span>
            <span className="text-xs font-medium">{item.value}</span>
          </div>
        )

        return item.href ? (
          <Link key={i} href={item.href}>{content}</Link>
        ) : (
          <div key={i}>{content}</div>
        )
      })}
    </div>
  )
}
