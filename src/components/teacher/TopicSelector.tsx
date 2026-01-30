'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, PricingType } from '@/types/database'

interface TopicSelectorProps {
  selectedTopicId: string
  onTopicSelect: (topicId: string) => void
  onTopicCreated?: (topicId: string) => void
}

interface TopicWithCount extends Classroom {
  lessonCount: number
}

export function TopicSelector({
  selectedTopicId,
  onTopicSelect,
  onTopicCreated,
}: TopicSelectorProps) {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useAuth()

  const [topics, setTopics] = useState<TopicWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New topic form state
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [pricingType, setPricingType] = useState<PricingType>('free')
  const [monthlyPrice, setMonthlyPrice] = useState<number>(9)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchTopics = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      const { data: classrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })

      if (classroomsError) throw classroomsError
      if (!classrooms || classrooms.length === 0) {
        setTopics([])
        setLoading(false)
        return
      }

      // Fetch lesson counts for all classrooms in one query
      const classroomIds = classrooms.map((c) => c.id)
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('classroom_id')
        .in('classroom_id', classroomIds)

      if (lessonsError) throw lessonsError

      // Count lessons per classroom
      const countMap: Record<string, number> = {}
      for (const lesson of lessons || []) {
        countMap[lesson.classroom_id] = (countMap[lesson.classroom_id] || 0) + 1
      }

      const topicsWithCounts: TopicWithCount[] = classrooms.map((c) => ({
        ...c,
        lessonCount: countMap[c.id] || 0,
      }))

      setTopics(topicsWithCounts)
    } catch (err) {
      console.error('Failed to fetch topics:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    fetchTopics()
  }, [fetchTopics])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedTopic = topics.find((t) => t.id === selectedTopicId)

  const handleSelectTopic = (topicId: string) => {
    onTopicSelect(topicId)
    setIsOpen(false)
    setShowNewForm(false)
  }

  const handleNewTopicClick = () => {
    setIsOpen(false)
    setShowNewForm(true)
  }

  const resetForm = () => {
    setNewName('')
    setNewDescription('')
    setPricingType('free')
    setMonthlyPrice(9)
    setError(null)
  }

  const handleCancelNew = () => {
    setShowNewForm(false)
    resetForm()
  }

  const handleCreateTopic = async () => {
    if (!profile?.id) return
    if (!newName.trim()) {
      setError('Topic name is required')
      return
    }
    if (pricingType === 'paid' && monthlyPrice < 1) {
      setError('Price must be at least $1')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          pricing_type: pricingType,
          monthly_price: pricingType === 'free' ? 0 : monthlyPrice,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create topic')
      }

      const { topic } = await res.json()

      // Refresh topics list
      await fetchTopics()

      // Notify parent
      onTopicCreated?.(topic.id)
      onTopicSelect(topic.id)

      // Reset
      setShowNewForm(false)
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create topic'
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  if (!profile) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Custom dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors flex items-center justify-between text-left"
      >
        {loading ? (
          <span className="text-[var(--muted)]">Loading...</span>
        ) : selectedTopic ? (
          <span className="truncate">{selectedTopic.name}</span>
        ) : (
          <span className="text-[var(--muted)]">Select a topic</span>
        )}
        <span
          className="material-symbols-outlined text-[var(--muted)] text-lg transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full glass-floating rounded-xl shadow-lg overflow-hidden">
          {topics.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-[var(--muted)]">
              No topics yet
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-black/5 transition-colors ${
                    topic.id === selectedTopicId ? 'bg-black/[0.06]' : ''
                  }`}
                >
                  <span className="truncate">{topic.name}</span>
                  <span className="text-xs text-[var(--muted)] ml-2 shrink-0">
                    {topic.lessonCount} {topic.lessonCount === 1 ? 'lesson' : 'lessons'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* New Topic option */}
          <button
            type="button"
            onClick={handleNewTopicClick}
            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-black/5 transition-colors border-t border-[var(--glass-surface-border)] text-[var(--gold)]"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Topic
          </button>
        </div>
      )}

      {/* Inline new topic form */}
      {showNewForm && (
        <div className="mt-3 glass-floating rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--gold)] text-lg">add_circle</span>
              New Topic
            </h4>
            <button
              type="button"
              onClick={handleCancelNew}
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Topic Name */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Topic Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. ICT Fundamentals"
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Description (optional)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief description of this topic..."
              rows={2}
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
            />
          </div>

          {/* Pricing Toggle */}
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Pricing
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPricingType('free')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors border ${
                  pricingType === 'free'
                    ? 'bg-[var(--success)]/20 border-[var(--success)] text-[var(--success)]'
                    : 'border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)] hover:border-[var(--gold)]'
                }`}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => setPricingType('paid')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors border ${
                  pricingType === 'paid'
                    ? 'bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)]'
                    : 'border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)] hover:border-[var(--gold)]'
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Price input (shown when Paid is selected) */}
          {pricingType === 'paid' && (
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                Monthly Price
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">$</span>
                <input
                  type="number"
                  min={1}
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="w-full input-field rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-[var(--danger)]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelNew}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-glass text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTopic}
              disabled={creating || !newName.trim()}
              className="flex-1 gold-gradient text-black font-bold py-2.5 rounded-xl text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  Creating...
                </>
              ) : (
                'Create Topic'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
