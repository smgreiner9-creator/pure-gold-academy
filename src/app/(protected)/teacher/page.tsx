'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, Profile, JournalEntry } from '@/types/database'

interface DashboardStats {
  totalStudents: number
  activeStudents: number
  totalJournals: number
  avgWinRate: number
  contentCount: number
}

export default function TeacherDashboardPage() {
  const { profile } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalJournals: 0,
    avgWinRate: 0,
    contentCount: 0,
  })
  const [recentJournals, setRecentJournals] = useState<(JournalEntry & { student?: Profile })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData()
    }
  }, [profile?.id])

  const loadDashboardData = async () => {
    if (!profile?.id) return

    try {
      // Load classrooms
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      setClassrooms(classroomData || [])

      if (classroomData && classroomData.length > 0) {
        const classroomIds = classroomData.map(c => c.id)

        // Load students
        const { data: students } = await supabase
          .from('profiles')
          .select('*')
          .in('classroom_id', classroomIds)

        // Load journals
        const { data: journals } = await supabase
          .from('journal_entries')
          .select('*')
          .in('classroom_id', classroomIds)
          .order('created_at', { ascending: false })
          .limit(10)

        setRecentJournals((journals || []) as (JournalEntry & { student?: Profile })[])

        // Load content count
        const { count: contentCount } = await supabase
          .from('learn_content')
          .select('id', { count: 'exact' })
          .in('classroom_id', classroomIds)

        // Calculate stats
        const totalStudents = students?.length || 0
        const totalJournals = journals?.length || 0
        const wins = journals?.filter(j => j.outcome === 'win').length || 0
        const totalWithOutcome = journals?.filter(j => j.outcome).length || 0

        // Active students = students who journaled in last 7 days
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const activeStudentIds = new Set(
          journals?.filter(j => new Date(j.created_at) >= weekAgo).map(j => j.user_id)
        )

        setStats({
          totalStudents,
          activeStudents: activeStudentIds.size,
          totalJournals,
          avgWinRate: totalWithOutcome > 0 ? (wins / totalWithOutcome) * 100 : 0,
          contentCount: contentCount || 0,
        })
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: 'group', color: 'text-[var(--gold)]' },
    { label: 'Active (7d)', value: stats.activeStudents, icon: 'trending_up', color: 'text-[var(--success)]' },
    { label: 'Journal Entries', value: stats.totalJournals, icon: 'edit_note', color: 'text-[var(--gold)]' },
    { label: 'Content Items', value: stats.contentCount, icon: 'menu_book', color: 'text-[var(--gold)]' },
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-[var(--muted)] text-sm">Manage your classrooms and students</p>
        </div>
        <Link
          href="/teacher/classrooms"
          className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm w-fit"
        >
          <span className="material-symbols-outlined text-lg">school</span>
          Manage Classrooms
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--muted)]">{stat.label}</span>
              <span className={`material-symbols-outlined text-lg ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/teacher/students"
          className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">group</span>
            </div>
            <div>
              <h3 className="font-bold">Student Analytics</h3>
              <p className="text-sm text-[var(--muted)]">View progress and performance</p>
            </div>
          </div>
        </Link>

        <Link
          href="/teacher/journals"
          className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">edit_note</span>
            </div>
            <div>
              <h3 className="font-bold">Review Journals</h3>
              <p className="text-sm text-[var(--muted)]">Give feedback to students</p>
            </div>
          </div>
        </Link>

        <Link
          href="/teacher/content"
          className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">menu_book</span>
            </div>
            <div>
              <h3 className="font-bold">Upload Content</h3>
              <p className="text-sm text-[var(--muted)]">Add videos, PDFs & articles</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Journals */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Recent Student Journals</h3>
          <Link href="/teacher/journals" className="text-[var(--gold)] text-sm hover:underline">
            View All
          </Link>
        </div>

        {recentJournals.length === 0 ? (
          <p className="text-[var(--muted)] text-center py-8">No journal entries yet</p>
        ) : (
          <div className="space-y-2">
            {recentJournals.slice(0, 5).map(journal => (
              <Link
                key={journal.id}
                href={`/teacher/journals/${journal.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center text-black font-bold text-sm">
                    {(journal.student as Profile)?.display_name?.[0] || 'S'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {journal.instrument} - <span className={journal.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{journal.direction.toUpperCase()}</span>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {(journal.student as Profile)?.display_name || (journal.student as Profile)?.email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${
                    journal.outcome === 'win' ? 'text-[var(--success)]' :
                    journal.outcome === 'loss' ? 'text-[var(--danger)]' :
                    'text-[var(--muted)]'
                  }`}>
                    {journal.outcome ? journal.outcome.toUpperCase() : 'Open'}
                  </span>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(journal.trade_date).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Classrooms */}
      {classrooms.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Create Your First Classroom</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Set up a classroom to start accepting students
          </p>
          <Link
            href="/teacher/classrooms"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Classroom
          </Link>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-4">Your Classrooms</h3>
          <div className="space-y-3">
            {classrooms.map(classroom => (
              <div
                key={classroom.id}
                className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[var(--card-border)]"
              >
                <div>
                  <p className="font-bold">{classroom.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Invite code: <span className="font-mono text-[var(--gold)]">{classroom.invite_code}</span>
                  </p>
                </div>
                <Link
                  href={`/teacher/classrooms/${classroom.id}`}
                  className="h-9 px-4 rounded-lg border border-[var(--card-border)] flex items-center gap-2 font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
