'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { JournalEntry, Profile, Classroom } from '@/types/database'

const PAGE_SIZE = 20

export default function TeacherJournalsPage() {
  const { profile } = useAuth()
  const [journals, setJournals] = useState<(JournalEntry & { student?: Profile; feedback_count?: number })[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSendingFeedback, setIsSendingFeedback] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const loadClassrooms = useCallback(async () => {
    if (!profile?.id) return

    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', profile.id)

    setClassrooms(data || [])
  }, [profile?.id, supabase])

  const loadJournals = useCallback(async (append = false) => {
    if (!profile?.id) return

    if (append) {
      setLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const classroomIds = selectedClassroom === 'all'
        ? classrooms.map(c => c.id)
        : [selectedClassroom]

      const offset = append ? journals.length : 0

      // Load journals
      const journalsRes = await supabase
        .from('journal_entries')
        .select('*')
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      const journalsData = journalsRes.data || []

      // Load student profiles
      const studentIds = [...new Set(journalsData.map(j => j.user_id))]
      const { data: studentProfiles } = studentIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, email, display_name, avatar_url')
            .in('id', studentIds)
        : { data: [] }

      const studentMap = new Map((studentProfiles || []).map(s => [s.id, s]))

      // Check if there are more
      setHasMore(journalsData.length === PAGE_SIZE)

      // Get all journal IDs and fetch feedback counts in one query
      const journalIds = journalsData.map(j => j.id)
      const { data: feedbackData } = journalIds.length > 0
        ? await supabase
            .from('journal_feedback')
            .select('journal_entry_id')
            .in('journal_entry_id', journalIds)
        : { data: [] }

      // Count feedback per journal
      const feedbackCounts = new Map<string, number>()
      feedbackData?.forEach(f => {
        feedbackCounts.set(f.journal_entry_id, (feedbackCounts.get(f.journal_entry_id) || 0) + 1)
      })

      // Add feedback counts and student to journals
      const journalsWithFeedback = journalsData.map(journal => ({
        ...journal,
        student: studentMap.get(journal.user_id),
        feedback_count: feedbackCounts.get(journal.id) || 0
      }))

      if (append) {
        setJournals(prev => [...prev, ...journalsWithFeedback] as (JournalEntry & { student?: Profile; feedback_count?: number })[])
      } else {
        setJournals(journalsWithFeedback as (JournalEntry & { student?: Profile; feedback_count?: number })[])
      }
    } catch (error) {
      console.error('Error loading journals:', error)
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }, [classrooms, journals.length, profile?.id, selectedClassroom, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadClassrooms()
    }
  }, [profile?.id, loadClassrooms])

  useEffect(() => {
    if (classrooms.length > 0) {
      loadJournals()
    }
  }, [selectedClassroom, classrooms, loadJournals])

  const sendFeedback = async () => {
    if (!profile?.id || !selectedJournal || !feedbackText.trim()) return

    setIsSendingFeedback(true)
    try {
      await supabase.from('journal_feedback').insert({
        journal_entry_id: selectedJournal,
        teacher_id: profile.id,
        content: feedbackText.trim(),
      })

      // Update feedback count
      setJournals(journals.map(j =>
        j.id === selectedJournal
          ? { ...j, feedback_count: (j.feedback_count || 0) + 1 }
          : j
      ))

      // Create notification for student
      const journal = journals.find(j => j.id === selectedJournal)
      if (journal?.student) {
        await supabase.from('notifications').insert({
          user_id: (journal.student as Profile).id,
          title: 'New Feedback',
          message: `Your teacher left feedback on your ${journal.instrument} trade journal`,
          type: 'feedback',
          link: `/journal/${journal.id}`,
        })
      }

      setFeedbackText('')
      setSelectedJournal(null)
    } catch (error) {
      console.error('Error sending feedback:', error)
    } finally {
      setIsSendingFeedback(false)
    }
  }

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'win': return 'text-[var(--success)] bg-[var(--success)]/10'
      case 'loss': return 'text-[var(--danger)] bg-[var(--danger)]/10'
      case 'breakeven': return 'text-[var(--warning)] bg-[var(--warning)]/10'
      default: return 'text-[var(--muted)] bg-white/5'
    }
  }

  if (isLoading && journals.length === 0) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Journals</h1>
          <p className="text-[var(--muted)] text-sm">Review and provide feedback on student trades</p>
        </div>
        <select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
        >
          <option value="all">All Classrooms</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {journals.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">edit_note</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Journals Yet</h3>
          <p className="text-[var(--muted)] text-sm">
            Your students have not created any journal entries yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {journals.map(journal => (
            <div
              key={journal.id}
              className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-colors"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-black font-bold">
                      {(journal.student as Profile)?.display_name?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="font-bold">
                        {(journal.student as Profile)?.display_name || (journal.student as Profile)?.email}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {new Date(journal.trade_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getOutcomeColor(journal.outcome)}`}>
                      {journal.outcome || 'Open'}
                    </span>
                    <span className="font-bold">{journal.instrument}</span>
                    <span className={`flex items-center gap-1 text-sm font-semibold ${
                      journal.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {journal.direction === 'long' ? 'trending_up' : 'trending_down'}
                      </span>
                      {journal.direction.toUpperCase()}
                    </span>
                    {journal.r_multiple !== null && (
                      <span className={`font-bold ${journal.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {journal.r_multiple >= 0 ? '+' : ''}{journal.r_multiple}R
                      </span>
                    )}
                  </div>
                </div>

                {journal.notes && (
                  <p className="text-sm text-[var(--muted)] bg-black/20 p-3 rounded-xl">
                    {journal.notes.substring(0, 200)}
                    {journal.notes.length > 200 && '...'}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                      <span className="material-symbols-outlined text-sm">chat</span>
                      {journal.feedback_count || 0} feedback
                    </span>
                    {journal.screenshot_urls && journal.screenshot_urls.length > 0 && (
                      <span className="text-sm text-[var(--muted)]">
                        {journal.screenshot_urls.length} screenshots
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedJournal(selectedJournal === journal.id ? null : journal.id)}
                      className="h-9 px-4 rounded-lg border border-[var(--card-border)] flex items-center gap-2 font-semibold hover:bg-white/5 transition-colors text-sm"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      Feedback
                    </button>
                    <Link
                      href={`/journal/${journal.id}`}
                      className="h-9 px-4 rounded-lg gold-gradient text-black font-bold flex items-center gap-2 hover:opacity-90 transition-all text-sm"
                    >
                      View Full
                    </Link>
                  </div>
                </div>

                {/* Feedback Form */}
                {selectedJournal === journal.id && (
                  <div className="pt-3 border-t border-[var(--card-border)]">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Write your feedback for this trade..."
                      rows={3}
                      className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none mb-3"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={sendFeedback}
                        disabled={isSendingFeedback || !feedbackText.trim()}
                        className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                      >
                        {isSendingFeedback ? (
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-lg">send</span>
                        )}
                        Send Feedback
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <button
              onClick={() => loadJournals(true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:border-[var(--gold)]/30 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Loading...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                  Load More Journals
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
