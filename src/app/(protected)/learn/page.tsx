'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ContentCard } from '@/components/learn/ContentCard'
import type { LearnContent, LearnProgress } from '@/types/database'

export default function LearnPage() {
  const { profile, isPremium } = useAuth()
  const [content, setContent] = useState<LearnContent[]>([])
  const [progress, setProgress] = useState<Record<string, LearnProgress>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadContent()
    }
  }, [profile?.id, profile?.classroom_id])

  const loadContent = async () => {
    if (!profile?.id) return

    setIsLoading(true)
    try {
      // Load content
      let query = supabase
        .from('learn_content')
        .select('*')
        .order('order_index', { ascending: true })

      if (profile.classroom_id) {
        query = query.eq('classroom_id', profile.classroom_id)
      }

      const { data: contentData } = await query
      setContent(contentData || [])

      // Load progress
      const { data: progressData } = await supabase
        .from('learn_progress')
        .select('*')
        .eq('user_id', profile.id)

      if (progressData) {
        const progressMap: Record<string, LearnProgress> = {}
        progressData.forEach(p => {
          progressMap[p.content_id] = p
        })
        setProgress(progressMap)
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredContent = content.filter(c => {
    if (filter === 'completed') return progress[c.id]?.completed
    if (filter === 'in-progress') return progress[c.id] && !progress[c.id].completed
    if (filter === 'not-started') return !progress[c.id]
    return true
  })

  const completedCount = content.filter(c => progress[c.id]?.completed).length
  const totalCount = content.length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Learn</h1>
          <p className="text-[var(--muted)] text-sm">Educational content from your teacher</p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[var(--gold)]">school</span>
          </div>
          <div>
            <p className="font-bold">Your Progress</p>
            <p className="text-sm text-[var(--muted)]">
              {completedCount} of {totalCount} lessons completed
            </p>
          </div>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--muted)]">Completion</span>
            <span className="font-bold text-[var(--gold)]">{Math.round((completedCount / totalCount) * 100 || 0)}%</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--gold)] rounded-full transition-all"
              style={{ width: `${(completedCount / totalCount) * 100 || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm appearance-none cursor-pointer transition-colors min-w-[160px]"
        >
          <option value="all">All Content</option>
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className="p-12 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">menu_book</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {content.length === 0 ? 'No content available' : 'No content matches your filter'}
          </h3>
          <p className="text-[var(--muted)] text-sm">
            {content.length === 0
              ? 'Join a classroom to access educational content'
              : 'Try changing your filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContent.map(c => (
            <ContentCard
              key={c.id}
              content={c}
              progress={progress[c.id]}
              isPremiumUser={isPremium}
            />
          ))}
        </div>
      )}
    </div>
  )
}
