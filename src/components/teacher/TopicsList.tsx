'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, ClassroomPricing } from '@/types/database'

interface TopicWithMeta {
  classroom: Classroom
  lessonCount: number
  pricing: ClassroomPricing | null
}

export function TopicsList() {
  const { profile } = useAuth()
  const [topics, setTopics] = useState<TopicWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return

    const fetchTopics = async () => {
      setLoading(true)
      const supabase = createClient()

      // Fetch teacher's classrooms
      const { data: classrooms, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })

      if (error || !classrooms) {
        console.error('Error fetching classrooms:', error)
        setLoading(false)
        return
      }

      // For each classroom, fetch lesson count and pricing
      const topicsWithMeta: TopicWithMeta[] = await Promise.all(
        classrooms.map(async (classroom) => {
          const [lessonsResult, pricingResult] = await Promise.all([
            supabase
              .from('lessons')
              .select('id', { count: 'exact', head: true })
              .eq('classroom_id', classroom.id),
            supabase
              .from('classroom_pricing')
              .select('*')
              .eq('classroom_id', classroom.id)
              .maybeSingle(),
          ])

          return {
            classroom,
            lessonCount: lessonsResult.count ?? 0,
            pricing: pricingResult.data,
          }
        })
      )

      setTopics(topicsWithMeta)
      setLoading(false)
    }

    fetchTopics()
  }, [profile?.id])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl glass-surface animate-pulse"
          >
            <div className="h-4 w-1/3 bg-black/[0.06] rounded mb-2" />
            <div className="h-3 w-1/4 bg-black/5 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-surface text-center">
        <span className="material-symbols-outlined text-3xl text-[var(--muted)] mb-2 block">
          school
        </span>
        <p className="text-sm text-[var(--muted)]">
          Create your first topic to start adding lessons
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {topics.map(({ classroom, lessonCount, pricing }) => {
        const isFree = !pricing || pricing.pricing_type === 'free'
        const priceLabel = isFree
          ? 'Free'
          : `$${pricing!.monthly_price.toFixed(2)}/mo`

        return (
          <Link
            key={classroom.id}
            href={`/teacher/topics/${classroom.id}`}
            className="p-4 rounded-2xl glass-surface glass-interactive transition-all cursor-pointer flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">{classroom.name}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isFree ? (
                <span className="text-[9px] px-2 py-0.5 rounded-lg bg-black/5 text-[var(--muted)] font-bold uppercase">
                  Free
                </span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] font-bold">
                  {priceLabel}
                </span>
              )}
              <span className="material-symbols-outlined text-base text-[var(--muted)]">
                chevron_right
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
