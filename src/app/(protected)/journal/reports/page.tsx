'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ProgressReport as ProgressReportComponent } from '@/components/reports/ProgressReport'
import type { ProgressReport, ProgressReportData } from '@/types/database'

interface ReportWithMeta extends ProgressReport {
  classroomName: string
  studentName: string
}

export default function ReportsPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [reports, setReports] = useState<ReportWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReports() {
      if (!profile?.id) return

      try {
        // Fetch reports
        const { data: reportsData, error } = await supabase
          .from('progress_reports')
          .select('*')
          .eq('user_id', profile.id)
          .order('period_end', { ascending: false })

        if (error) throw error
        if (!reportsData || reportsData.length === 0) {
          setReports([])
          return
        }

        // Gather unique classroom IDs
        const classroomIds = [...new Set(reportsData.map(r => r.classroom_id))]

        // Fetch classrooms separately
        const { data: classrooms } = await supabase
          .from('classrooms')
          .select('id, name')
          .in('id', classroomIds)

        const classroomMap = new Map<string, { id: string; name: string }>()
        if (classrooms) {
          for (const c of classrooms) {
            classroomMap.set(c.id, c)
          }
        }

        // Build enriched reports
        const enriched: ReportWithMeta[] = reportsData.map(r => ({
          ...r,
          classroomName: classroomMap.get(r.classroom_id)?.name || 'Unknown Classroom',
          studentName: profile.display_name || profile.email || 'Student',
        }))

        setReports(enriched)
      } catch (err) {
        console.error('Error fetching reports:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (profile?.id) {
      fetchReports()
    }
  }, [profile?.id, profile?.display_name, profile?.email, supabase])

  const handleNotesUpdate = useCallback(async (reportId: string, notes: string) => {
    const res = await fetch('/api/reports/generate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, teacher_notes: notes }),
    })
    if (!res.ok) throw new Error('Failed to update notes')
    const { report } = await res.json()
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, ...report } : r))
  }, [])

  // Group reports by classroom
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; reports: ReportWithMeta[] }>()
    for (const r of reports) {
      if (!map.has(r.classroom_id)) {
        map.set(r.classroom_id, { name: r.classroomName, reports: [] })
      }
      map.get(r.classroom_id)!.reports.push(r)
    }
    return Array.from(map.entries())
  }, [reports])

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/5 rounded w-1/3" />
          <div className="h-32 bg-black/5 rounded" />
          <div className="h-32 bg-black/5 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/journal"
            className="w-10 h-10 rounded-lg border border-[var(--glass-surface-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Progress Reports</h1>
            <p className="text-sm text-[var(--muted)]">Your trading performance reports from teachers</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-[var(--gold)]">
            progress_activity
          </span>
          <p className="text-[var(--muted)] mt-4">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-surface">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">assessment</span>
          </div>
          <h2 className="text-xl font-bold mb-2">No Reports Yet</h2>
          <p className="text-[var(--muted)] mb-6">
            Your teacher will generate progress reports as you log trades in your classroom.
          </p>
          <Link
            href="/journal/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined">add</span>
            Log a Trade
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([classroomId, group]) => (
            <div key={classroomId}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-sm text-[var(--gold)]">school</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)]">
                  {group.name}
                </h2>
              </div>
              <div className="space-y-3">
                {group.reports.map((report) => {
                  const data = report.report_data as unknown as ProgressReportData
                  const isExpanded = expandedId === report.id

                  return (
                    <div key={report.id}>
                      {/* Report Card */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : report.id)}
                        className="w-full text-left p-4 rounded-xl glass-surface hover:border-[var(--gold)]/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[var(--gold)]">assessment</span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {formatDateRange(report.period_start, report.period_end)}
                              </p>
                              {report.teacher_notes && (
                                <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">
                                  Teacher: &quot;{report.teacher_notes}&quot;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Quick Stats */}
                            <div className="hidden sm:flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-[var(--muted)]">Trades</p>
                                <p className="text-sm font-bold">{data.totalTrades}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[var(--muted)]">Win Rate</p>
                                <p className={`text-sm font-bold ${data.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                  {data.winRate}%
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[var(--muted)]">Avg R</p>
                                <p className={`text-sm font-bold ${data.avgRMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                  {data.avgRMultiple}R
                                </p>
                              </div>
                            </div>

                            <span className={`material-symbols-outlined text-[var(--muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </div>
                        </div>

                        {/* Mobile quick stats */}
                        <div className="flex items-center gap-4 mt-3 sm:hidden">
                          <div>
                            <p className="text-xs text-[var(--muted)]">Trades</p>
                            <p className="text-sm font-bold">{data.totalTrades}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--muted)]">Win Rate</p>
                            <p className={`text-sm font-bold ${data.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                              {data.winRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--muted)]">Avg R</p>
                            <p className={`text-sm font-bold ${data.avgRMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                              {data.avgRMultiple}R
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Report */}
                      {isExpanded && (
                        <div className="mt-3 ml-0 md:ml-4">
                          <ProgressReportComponent
                            report={report}
                            studentName={report.studentName}
                            classroomName={report.classroomName}
                            isTeacher={false}
                            onNotesUpdate={handleNotesUpdate}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
