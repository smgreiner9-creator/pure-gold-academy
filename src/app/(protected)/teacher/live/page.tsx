'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Input, Textarea, Select } from '@/components/ui'
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns'
import type { LiveSession, Classroom, LiveSessionStatus } from '@/types/database'

const statusColors: Record<LiveSessionStatus, string> = {
  scheduled: 'bg-blue-500/20 text-blue-500',
  live: 'bg-red-500/20 text-red-500',
  ended: 'bg-[var(--muted)]/20 text-[var(--muted)]',
  cancelled: 'bg-[var(--muted)]/20 text-[var(--muted)]',
}

export default function TeacherLiveSessionsPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<(LiveSession & { teacher?: { display_name: string | null } })[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_start: '',
    scheduled_duration_minutes: '60',
    stream_url: '',
  })

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Load classrooms
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      setClassrooms(classroomData || [])

      if (classroomData && classroomData.length > 0) {
        const defaultClassroom = selectedClassroom || classroomData[0].id
        if (!selectedClassroom) {
          setSelectedClassroom(defaultClassroom)
        }
      }

      // Load sessions
      let query = supabase
        .from('live_sessions')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('scheduled_start', { ascending: false })

      if (selectedClassroom) {
        query = query.eq('classroom_id', selectedClassroom)
      }

      const { data: sessionData } = await query
      setSessions(sessionData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, selectedClassroom, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassroom) return

    setIsSubmitting(true)

    try {
      const endpoint = '/api/live-sessions'
      const method = editingSession ? 'PATCH' : 'POST'
      const body = editingSession
        ? {
            id: editingSession.id,
            title: formData.title,
            description: formData.description || null,
            scheduled_start: formData.scheduled_start,
            scheduled_duration_minutes: parseInt(formData.scheduled_duration_minutes),
            stream_url: formData.stream_url || null,
          }
        : {
            classroom_id: selectedClassroom,
            title: formData.title,
            description: formData.description || null,
            scheduled_start: formData.scheduled_start,
            scheduled_duration_minutes: parseInt(formData.scheduled_duration_minutes),
            stream_url: formData.stream_url || null,
          }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save session')

      setShowCreateForm(false)
      setEditingSession(null)
      setFormData({ title: '', description: '', scheduled_start: '', scheduled_duration_minutes: '60', stream_url: '' })
      loadData()
    } catch (error) {
      console.error('Error saving session:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (session: LiveSession) => {
    setEditingSession(session)
    setFormData({
      title: session.title,
      description: session.description || '',
      scheduled_start: session.scheduled_start.slice(0, 16),
      scheduled_duration_minutes: session.scheduled_duration_minutes.toString(),
      stream_url: session.stream_url || '',
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const res = await fetch(`/api/live-sessions?id=${sessionId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const handleStatusChange = async (sessionId: string, newStatus: LiveSessionStatus) => {
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId, status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      loadData()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const cancelForm = () => {
    setShowCreateForm(false)
    setEditingSession(null)
    setFormData({ title: '', description: '', scheduled_start: '', scheduled_duration_minutes: '60', stream_url: '' })
  }

  // Separate sessions by status
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && isFuture(new Date(s.scheduled_start)))
  const liveSessions = sessions.filter(s => s.status === 'live')
  const pastSessions = sessions.filter(s => s.status === 'ended' || s.status === 'cancelled' || (s.status === 'scheduled' && isPast(new Date(s.scheduled_start))))

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-[var(--glass-surface-border)] rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (classrooms.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="text-center py-12">
          <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)]">videocam</span>
          <h2 className="text-xl font-semibold mb-2">Create a Strategy First</h2>
          <p className="text-[var(--muted)] mb-4">
            You need to create a trading strategy before scheduling live sessions.
          </p>
          <Link href="/teacher/strategy/new">
            <Button>Create Strategy</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Live Sessions</h1>
          <p className="text-[var(--muted)]">Schedule and manage your live streams</p>
        </div>
        <div className="flex items-center gap-3">
          {classrooms.length > 1 && (
            <Select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-48"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}
          <Button onClick={() => setShowCreateForm(true)}>
            <span className="material-symbols-outlined text-lg">add</span>
            Schedule Session
          </Button>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold">
                {editingSession ? 'Edit Session' : 'Schedule Live Session'}
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1">Session Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Weekly Market Analysis"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will you cover in this session?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_start: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (mins)</label>
                  <Select
                    value={formData.scheduled_duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_duration_minutes: e.target.value }))}
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Stream URL (Optional)</label>
                <Input
                  type="url"
                  value={formData.stream_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, stream_url: e.target.value }))}
                  placeholder="YouTube, Twitch, or Zoom link"
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  Add this when you&apos;re ready to go live
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={cancelForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="flex-1">
                  {editingSession ? 'Update Session' : 'Schedule Session'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Live Now */}
      {liveSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-red-500 animate-pulse">radio_button_checked</span>
            Live Now
          </h2>
          {liveSessions.map(session => (
            <Card key={session.id} className="border-red-500/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{session.title}</h3>
                  <p className="text-sm text-[var(--muted)]">Started {formatDistanceToNow(new Date(session.actual_start || session.scheduled_start))} ago</p>
                </div>
                <div className="flex items-center gap-2">
                  {session.stream_url && (
                    <a href={session.stream_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Open Stream
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleStatusChange(session.id, 'ended')}
                  >
                    <span className="material-symbols-outlined text-sm">stop</span>
                    End Session
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
        {upcomingSessions.length === 0 ? (
          <Card className="text-center py-8">
            <span className="material-symbols-outlined text-4xl mx-auto mb-3 text-[var(--muted)]">calendar_today</span>
            <p className="text-[var(--muted)] mb-3">No upcoming sessions scheduled</p>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <span className="material-symbols-outlined text-base">add</span>
              Schedule Session
            </Button>
          </Card>
        ) : (
          upcomingSessions.map(session => (
            <Card key={session.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{session.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[session.status]}`}>
                      Scheduled
                    </span>
                  </div>
                  {session.description && (
                    <p className="text-sm text-[var(--muted)] mb-2">{session.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      {format(new Date(session.scheduled_start), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {format(new Date(session.scheduled_start), 'h:mm a')}
                    </span>
                    <span>{session.scheduled_duration_minutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange(session.id, 'live')}
                    title="Go Live"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--success)]">play_arrow</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(session)}>
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(session.id)}>
                    <span className="material-symbols-outlined text-sm text-[var(--danger)]">delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--muted)]">Past Sessions</h2>
          {pastSessions.slice(0, 5).map(session => (
            <Card key={session.id} className="opacity-60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{session.title}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {format(new Date(session.scheduled_start), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[session.status]}`}>
                  {session.status === 'ended' ? 'Ended' : session.status === 'cancelled' ? 'Cancelled' : 'Missed'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
