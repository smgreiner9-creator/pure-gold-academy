'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, Lesson, ClassroomPricing } from '@/types/database'

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [topic, setTopic] = useState<Classroom | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [pricing, setPricing] = useState<ClassroomPricing | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!profile?.id || !id) return

    const fetchData = async () => {
      setLoading(true)

      const [topicRes, lessonsRes, pricingRes, studentsRes] = await Promise.all([
        supabase.from('classrooms').select('*').eq('id', id).eq('teacher_id', profile.id).single(),
        supabase.from('lessons').select('*').eq('classroom_id', id).order('order_index', { ascending: true }),
        supabase.from('classroom_pricing').select('*').eq('classroom_id', id).maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('classroom_id', id),
      ])

      if (topicRes.data) {
        setTopic(topicRes.data)
        setEditName(topicRes.data.name)
        setEditDescription(topicRes.data.description || '')
      }
      setLessons((lessonsRes.data || []) as Lesson[])
      setPricing(pricingRes.data)
      setStudentCount(studentsRes.count || 0)
      setLoading(false)
    }

    fetchData()
  }, [profile?.id, id, supabase])

  const handleSaveEdit = async () => {
    if (!editName.trim() || !id || !profile?.id) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('classrooms')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
        })
        .eq('id', id)
        .eq('teacher_id', profile.id)

      if (error) throw error

      setTopic(prev => prev ? { ...prev, name: editName.trim(), description: editDescription.trim() || null } : null)
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving topic:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteLesson = async (lessonId: string) => {
    if (!profile?.id) return
    if (!confirm('Delete this lesson? This cannot be undone.')) return

    try {
      await supabase.from('lessons').delete().eq('id', lessonId).eq('teacher_id', profile.id)
      // Also clean up dual-written learn_content
      await supabase.from('learn_content').delete().eq('lesson_id', lessonId)
      setLessons(prev => prev.filter(l => l.id !== lessonId))
    } catch (err) {
      console.error('Error deleting lesson:', err)
    }
  }

  const getContentIcon = (type: string | null) => {
    switch (type) {
      case 'video': return 'play_circle'
      case 'chart': return 'candlestick_chart'
      case 'pdf': return 'description'
      case 'text': return 'article'
      default: return 'school'
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4">
        <div className="p-6 rounded-2xl glass-surface animate-pulse h-64" />
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 text-center">
        <p className="text-[var(--muted)]">Topic not found</p>
        <Link href="/teacher/topics" className="text-[var(--gold)] text-sm mt-2 inline-block">
          Back to Topics
        </Link>
      </div>
    )
  }

  const isFree = !pricing || pricing.pricing_type === 'free'

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Back link */}
      <Link href="/teacher/topics" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors">
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Topics
      </Link>

      {/* Topic Header */}
      <div className="p-6 rounded-2xl glass-surface">
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors font-bold text-lg"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              placeholder="Description (optional)"
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="h-9 px-4 rounded-lg btn-glass text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim()}
                className="gold-gradient text-black font-bold h-9 px-4 rounded-lg text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{topic.name}</h1>
              {topic.description && (
                <p className="text-sm text-[var(--muted)] mt-1">{topic.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                {isFree ? (
                  <span className="text-[9px] px-2 py-0.5 rounded-lg bg-black/5 text-[var(--muted)] font-bold uppercase">Free</span>
                ) : (
                  <span className="text-[9px] px-2 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] font-bold">${pricing!.monthly_price.toFixed(2)}/mo</span>
                )}
                <span className="text-xs text-[var(--muted)]">{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
                <span className="text-xs text-[var(--muted)]">Code: <span className="font-mono text-[var(--foreground)]">{topic.invite_code}</span></span>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg hover:bg-black/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
          </div>
        )}
      </div>

      {/* Lessons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Lessons</h2>
        <Link
          href={`/teacher/lessons/new?topicId=${id}`}
          className="gold-gradient text-black font-bold h-9 px-4 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Lesson
        </Link>
      </div>

      {lessons.length === 0 ? (
        <div className="p-6 rounded-2xl glass-surface text-center">
          <span className="material-symbols-outlined text-3xl text-[var(--muted)] mb-2 block">school</span>
          <p className="text-sm text-[var(--muted)] mb-4">No lessons yet. Add your first lesson to this topic.</p>
          <Link
            href={`/teacher/lessons/new?topicId=${id}`}
            className="gold-gradient text-black font-bold h-10 px-5 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Lesson
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="p-4 rounded-2xl glass-surface flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl text-[var(--gold)]">
                  {getContentIcon(lesson.content_type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{lesson.title}</h3>
                  {lesson.status === 'draft' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-lg bg-black/5 text-[var(--muted)] font-bold uppercase">Draft</span>
                  )}
                </div>
                {lesson.summary && (
                  <p className="text-xs text-[var(--muted)] truncate mt-0.5">{lesson.summary}</p>
                )}
              </div>
              <button
                onClick={() => deleteLesson(lesson.id)}
                className="p-2 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
