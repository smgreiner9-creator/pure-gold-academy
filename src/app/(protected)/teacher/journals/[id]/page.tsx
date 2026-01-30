'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { JournalEntry, Profile, JournalFeedback } from '@/types/database'

interface FeedbackWithTeacher extends JournalFeedback {
  teacher?: Profile
}

export default function TeacherJournalDetailPage() {
  const params = useParams()
  const journalId = params.id as string
  const { profile } = useAuth()
  const [journal, setJournal] = useState<(JournalEntry & { student?: Profile }) | null>(null)
  const [feedback, setFeedback] = useState<FeedbackWithTeacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newFeedback, setNewFeedback] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const loadJournalData = useCallback(async () => {
    try {
      // Load journal and all feedback
      const [journalRes, feedbackRes] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*')
          .eq('id', journalId)
          .single(),
        supabase
          .from('journal_feedback')
          .select('*')
          .eq('journal_entry_id', journalId)
          .order('created_at', { ascending: true })
      ])

      if (journalRes.data) {
        // Load student profile
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url')
          .eq('id', journalRes.data.user_id)
          .single()

        setJournal({ ...journalRes.data, student: studentProfile } as JournalEntry & { student?: Profile })
      }

      // Load teacher profiles for feedback
      const feedbackData = feedbackRes.data || []
      if (feedbackData.length > 0) {
        const teacherIds = [...new Set(feedbackData.map(f => f.teacher_id))]
        const { data: teacherProfiles } = await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url')
          .in('id', teacherIds)

        const teacherMap = new Map((teacherProfiles || []).map(t => [t.id, t]))
        const feedbackWithTeachers = feedbackData.map(f => ({
          ...f,
          teacher: teacherMap.get(f.teacher_id)
        }))
        setFeedback(feedbackWithTeachers as FeedbackWithTeacher[])
      }
    } catch (error) {
      console.error('Error loading journal:', error)
    } finally {
      setIsLoading(false)
    }
  }, [journalId, supabase])

  useEffect(() => {
    if (profile?.id && journalId) {
      loadJournalData()
    }
  }, [profile?.id, journalId, loadJournalData])

  const sendFeedback = async () => {
    if (!profile?.id || !newFeedback.trim() || !journal) return

    setIsSending(true)
    try {
      const { data, error } = await supabase
        .from('journal_feedback')
        .insert({
          journal_entry_id: journalId,
          teacher_id: profile.id,
          content: newFeedback.trim(),
        })
        .select('*')
        .single()

      if (error) throw error

      // Create notification for student
      if (journal.student) {
        await supabase.from('notifications').insert({
          user_id: (journal.student as Profile).id,
          title: 'New Feedback',
          message: `Your teacher left feedback on your ${journal.instrument} trade journal`,
          type: 'feedback',
          link: `/journal/${journal.id}`,
        })
      }

      // Add teacher profile to new feedback
      const newFeedbackWithTeacher: FeedbackWithTeacher = {
        ...data,
        teacher: {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        } as Profile
      }

      setFeedback([...feedback, newFeedbackWithTeacher])
      setNewFeedback('')
    } catch (error) {
      console.error('Error sending feedback:', error)
    } finally {
      setIsSending(false)
    }
  }

  const startEditing = (f: FeedbackWithTeacher) => {
    setEditingFeedback(f.id)
    setEditText(f.content)
  }

  const saveEdit = async () => {
    if (!editingFeedback || !editText.trim()) return

    setIsSavingEdit(true)
    try {
      const { error } = await supabase
        .from('journal_feedback')
        .update({ content: editText.trim() })
        .eq('id', editingFeedback)

      if (error) throw error

      setFeedback(feedback.map(f =>
        f.id === editingFeedback ? { ...f, content: editText.trim() } : f
      ))
      setEditingFeedback(null)
      setEditText('')
    } catch (error) {
      console.error('Error updating feedback:', error)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('Delete this feedback?')) return

    try {
      await supabase.from('journal_feedback').delete().eq('id', feedbackId)
      setFeedback(feedback.filter(f => f.id !== feedbackId))
    } catch (error) {
      console.error('Error deleting feedback:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getOutcomeStyle = (outcome: string | null) => {
    switch (outcome) {
      case 'win': return { bg: 'bg-[var(--success)]/10', text: 'text-[var(--success)]' }
      case 'loss': return { bg: 'bg-[var(--danger)]/10', text: 'text-[var(--danger)]' }
      case 'breakeven': return { bg: 'bg-[var(--warning)]/10', text: 'text-[var(--warning)]' }
      default: return { bg: 'bg-black/5', text: 'text-[var(--muted)]' }
    }
  }

  const getEmotionIcon = (emotion: string) => {
    const icons: Record<string, string> = {
      calm: 'spa',
      confident: 'sentiment_very_satisfied',
      anxious: 'sentiment_stressed',
      fearful: 'sentiment_worried',
      greedy: 'attach_money',
      frustrated: 'sentiment_frustrated',
      neutral: 'sentiment_neutral'
    }
    return icons[emotion] || 'psychology'
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl glass-surface animate-pulse h-40" />
        <div className="p-6 rounded-2xl glass-surface animate-pulse h-60" />
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl glass-surface text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4">edit_note</span>
          <h3 className="text-xl font-bold mb-2">Journal Not Found</h3>
          <p className="text-[var(--muted)] mb-4">This journal entry may have been deleted.</p>
          <Link href="/teacher/journals" className="text-[var(--gold)] hover:underline">
            Back to Journals
          </Link>
        </div>
      </div>
    )
  }

  const outcomeStyle = getOutcomeStyle(journal.outcome)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/teacher/journals"
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Journals
      </Link>

      {/* Journal Header */}
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            {journal.student && (
              <Link
                href={`/teacher/students/${(journal.student as Profile).id}`}
                className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-black font-bold text-lg shrink-0"
              >
                {(journal.student as Profile).display_name?.[0] || (journal.student as Profile).email[0].toUpperCase()}
              </Link>
            )}
            <div>
              <h1 className="text-xl font-bold">
                {journal.instrument} - {journal.direction.toUpperCase()}
              </h1>
              {journal.student && (
                <Link
                  href={`/teacher/students/${(journal.student as Profile).id}`}
                  className="text-[var(--gold)] hover:underline text-sm"
                >
                  {(journal.student as Profile).display_name || (journal.student as Profile).email}
                </Link>
              )}
              <p className="text-xs text-[var(--muted)] mt-1">
                {formatDate(journal.trade_date)}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase ${outcomeStyle.bg} ${outcomeStyle.text}`}>
            {journal.outcome || 'Open'}
          </span>
        </div>

        {/* Trade Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 rounded-xl bg-black/20">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Entry Price</p>
            <p className="font-bold">${journal.entry_price.toLocaleString()}</p>
          </div>
          {journal.exit_price && (
            <div className="p-3 rounded-xl bg-black/20">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">Exit Price</p>
              <p className="font-bold">${journal.exit_price.toLocaleString()}</p>
            </div>
          )}
          {journal.r_multiple !== null && (
            <div className="p-3 rounded-xl bg-black/20">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">R-Multiple</p>
              <p className={`font-bold ${journal.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {journal.r_multiple >= 0 ? '+' : ''}{journal.r_multiple}R
              </p>
            </div>
          )}
          {journal.pnl !== null && (
            <div className="p-3 rounded-xl bg-black/20">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">P&L</p>
              <p className={`font-bold ${journal.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {journal.pnl >= 0 ? '+' : ''}${journal.pnl.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Emotions */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20">
            <span className="material-symbols-outlined text-sm text-[var(--gold)]">
              {getEmotionIcon(journal.emotion_before)}
            </span>
            <span className="text-xs">Before: <span className="capitalize font-semibold">{journal.emotion_before}</span></span>
          </div>
          {journal.emotion_during && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20">
              <span className="material-symbols-outlined text-sm text-[var(--gold)]">
                {getEmotionIcon(journal.emotion_during)}
              </span>
              <span className="text-xs">During: <span className="capitalize font-semibold">{journal.emotion_during}</span></span>
            </div>
          )}
          {journal.emotion_after && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20">
              <span className="material-symbols-outlined text-sm text-[var(--gold)]">
                {getEmotionIcon(journal.emotion_after)}
              </span>
              <span className="text-xs">After: <span className="capitalize font-semibold">{journal.emotion_after}</span></span>
            </div>
          )}
        </div>

        {/* Notes */}
        {journal.notes && (
          <div className="p-4 rounded-xl bg-black/20">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{journal.notes}</p>
          </div>
        )}

        {/* Screenshots */}
        {journal.screenshot_urls && journal.screenshot_urls.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-2">Screenshots</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {journal.screenshot_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-video relative rounded-xl overflow-hidden border border-[var(--glass-surface-border)] glass-interactive transition-colors"
                >
                  <Image
                    src={url}
                    alt={`Screenshot ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="p-6 rounded-2xl glass-surface">
        <h2 className="font-bold text-lg mb-4">
          Feedback
          {feedback.length > 0 && <span className="text-[var(--muted)] font-normal ml-2">({feedback.length})</span>}
        </h2>

        {/* Existing Feedback */}
        {feedback.length > 0 && (
          <div className="space-y-4 mb-6">
            {feedback.map(f => (
              <div key={f.id} className="p-4 rounded-xl glass-surface">
                {editingFeedback === f.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingFeedback(null)}
                        className="px-4 py-2 rounded-lg btn-glass text-sm font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={isSavingEdit || !editText.trim()}
                        className="px-4 py-2 rounded-lg gold-gradient text-black font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSavingEdit && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] font-bold text-sm">
                          {(f.teacher as Profile)?.display_name?.[0] || 'T'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {(f.teacher as Profile)?.display_name || 'Teacher'}
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">
                            {formatDate(f.created_at)}
                          </p>
                        </div>
                      </div>
                      {f.teacher_id === profile?.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(f)}
                            className="p-1.5 rounded-lg hover:bg-black/5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => deleteFeedback(f.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm">{f.content}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* New Feedback Form */}
        <div className="space-y-3">
          <textarea
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            placeholder="Write feedback for this trade..."
            rows={3}
            className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={sendFeedback}
              disabled={isSending || !newFeedback.trim()}
              className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
            >
              {isSending ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-lg">send</span>
              )}
              Send Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
