'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopicsList } from '@/components/teacher/TopicsList'

export default function TeacherDashboardPage() {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [hasTopics, setHasTopics] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    const loadStats = async () => {
      try {
        // Check if teacher has any classrooms
        const { data: classrooms } = await supabase
          .from('classrooms')
          .select('id')
          .eq('teacher_id', profile.id)

        const classroomIds = (classrooms || []).map(c => c.id)
        setHasTopics(classroomIds.length > 0)

        if (classroomIds.length > 0) {
          // Fetch student count and earnings in parallel
          const [studentsRes, earningsRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .in('classroom_id', classroomIds),
            supabase
              .from('classroom_subscriptions')
              .select('classroom_id')
              .in('classroom_id', classroomIds)
              .eq('status', 'active'),
          ])

          setTotalStudents(studentsRes.count || 0)

          // Estimate earnings from active subscriptions
          if (earningsRes.data && earningsRes.data.length > 0) {
            const { data: pricingData } = await supabase
              .from('classroom_pricing')
              .select('classroom_id, monthly_price')
              .in('classroom_id', classroomIds)
              .eq('pricing_type', 'paid')

            const pricingMap: Record<string, number> = {}
            for (const p of pricingData || []) {
              pricingMap[p.classroom_id] = p.monthly_price
            }

            const monthly = earningsRes.data.reduce((sum, sub) => {
              const price = pricingMap[sub.classroom_id] || 0
              return sum + (price * 0.85) // 15% platform fee
            }, 0)

            setTotalEarnings(monthly)
          }
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [profile?.id, supabase])

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
          ))}
        </div>
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-48" />
      </div>
    )
  }

  // First-time teacher - no topics yet
  if (hasTopics === false) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl gold-gradient flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-black">school</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome to Your Teaching Hub</h1>
          <p className="text-[var(--muted)] text-lg">
            Create your first topic and start adding lessons.
          </p>
        </div>

        <Link
          href="/teacher/lessons/new"
          className="gold-gradient text-black font-bold h-14 px-8 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-all text-lg w-full"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
          Add Your First Lesson
        </Link>

        <p className="text-center text-[var(--muted)] text-sm mt-4">
          You&apos;ll create a topic and add your lesson in one simple step
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Your Teaching Hub</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Manage your topics and lessons</p>
      </div>

      {/* 2 Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted)]">Total Students</span>
            <span className="material-symbols-outlined text-lg text-[var(--gold)]">group</span>
          </div>
          <p className="text-2xl font-bold text-[var(--gold)]">{totalStudents}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted)]">Monthly Earnings</span>
            <span className="material-symbols-outlined text-lg text-[var(--success)]">payments</span>
          </div>
          <p className="text-2xl font-bold text-[var(--success)]">${totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Topics List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Your Topics</h2>
          <Link
            href="/teacher/topics"
            className="text-[var(--gold)] text-sm hover:underline"
          >
            View All
          </Link>
        </div>
        <TopicsList />
      </div>
    </div>
  )
}
