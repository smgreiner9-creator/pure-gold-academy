'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { Profile, JournalEntry } from '@/types/database'

interface StudentWithEntries {
  profile: Profile
  entries: JournalEntry[]
}

interface StudentAlertsProps {
  students: StudentWithEntries[]
}

interface Alert {
  type: 'inactive' | 'losing_streak' | 'low_adherence'
  severity: 'warning' | 'danger'
  studentId: string
  studentName: string
  message: string
  icon: string
}

export function StudentAlerts({ students }: StudentAlertsProps) {
  const alerts = useMemo(() => {
    const result: Alert[] = []
    const now = new Date()

    students.forEach(({ profile, entries }) => {
      const name = profile.display_name || profile.email

      // 1. Students who haven't journaled in 7+ days
      if (entries.length === 0) {
        result.push({
          type: 'inactive',
          severity: 'warning',
          studentId: profile.id,
          studentName: name,
          message: 'Has never journaled a trade',
          icon: 'edit_off',
        })
      } else {
        const sorted = [...entries].sort(
          (a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
        )
        const lastDate = new Date(sorted[0].trade_date)
        const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysSince >= 14) {
          result.push({
            type: 'inactive',
            severity: 'danger',
            studentId: profile.id,
            studentName: name,
            message: `Inactive for ${daysSince} days`,
            icon: 'schedule',
          })
        } else if (daysSince >= 7) {
          result.push({
            type: 'inactive',
            severity: 'warning',
            studentId: profile.id,
            studentName: name,
            message: `No entries in ${daysSince} days`,
            icon: 'schedule',
          })
        }
      }

      // 2. Students on losing streaks (3+ consecutive losses)
      const closedEntries = entries
        .filter((e) => e.outcome !== null)
        .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime())

      if (closedEntries.length >= 3) {
        let losingStreak = 0
        for (const entry of closedEntries) {
          if (entry.outcome === 'loss') {
            losingStreak++
          } else {
            break
          }
        }

        if (losingStreak >= 5) {
          result.push({
            type: 'losing_streak',
            severity: 'danger',
            studentId: profile.id,
            studentName: name,
            message: `On a ${losingStreak}-trade losing streak`,
            icon: 'trending_down',
          })
        } else if (losingStreak >= 3) {
          result.push({
            type: 'losing_streak',
            severity: 'warning',
            studentId: profile.id,
            studentName: name,
            message: `${losingStreak} consecutive losses`,
            icon: 'trending_down',
          })
        }
      }

      // 3. Students with low rule adherence (< 40% average)
      const ruleKeys = ['plan', 'risk', 'confirmation', 'session', 'news', 'emotional', 'stop', 'journal']
      const entriesWithOutcome = entries.filter((e) => e.outcome !== null)

      if (entriesWithOutcome.length >= 3) {
        let totalFollowed = 0
        let totalPossible = 0

        entriesWithOutcome.forEach((entry) => {
          const rulesFollowed = Array.isArray(entry.rules_followed) ? (entry.rules_followed as string[]) : []
          totalFollowed += rulesFollowed.filter((r) => ruleKeys.includes(r)).length
          totalPossible += ruleKeys.length
        })

        const adherenceRate = totalPossible > 0 ? (totalFollowed / totalPossible) * 100 : 0

        if (adherenceRate < 30) {
          result.push({
            type: 'low_adherence',
            severity: 'danger',
            studentId: profile.id,
            studentName: name,
            message: `Rule adherence at ${adherenceRate.toFixed(0)}%`,
            icon: 'rule',
          })
        } else if (adherenceRate < 40) {
          result.push({
            type: 'low_adherence',
            severity: 'warning',
            studentId: profile.id,
            studentName: name,
            message: `Low rule adherence: ${adherenceRate.toFixed(0)}%`,
            icon: 'rule',
          })
        }
      }
    })

    // Sort: danger first, then by type
    result.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'danger' ? -1 : 1
      return a.type.localeCompare(b.type)
    })

    return result
  }, [students])

  if (alerts.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-[var(--success)]">check_circle</span>
          <h3 className="font-bold text-lg">Student Alerts</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">All students are on track. No alerts at this time.</p>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl glass-surface">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--warning)]">notifications_active</span>
          <h3 className="font-bold text-lg">Student Alerts</h3>
        </div>
        <span className="text-xs text-[var(--muted)] bg-[var(--warning)]/10 text-[var(--warning)] px-2.5 py-1 rounded-full font-bold">
          {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <Link
            key={`${alert.studentId}-${alert.type}-${i}`}
            href={`/teacher/students/${alert.studentId}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 transition-colors group"
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                alert.severity === 'danger'
                  ? 'bg-[var(--danger)]/10'
                  : 'bg-[var(--warning)]/10'
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  alert.severity === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'
                }`}
              >
                {alert.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate group-hover:text-[var(--gold)] transition-colors">
                {alert.studentName}
              </p>
              <p className={`text-xs ${
                alert.severity === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--warning)]'
              }`}>
                {alert.message}
              </p>
            </div>
            <span className="material-symbols-outlined text-[var(--muted)] text-lg group-hover:text-[var(--gold)] transition-colors shrink-0">
              chevron_right
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
