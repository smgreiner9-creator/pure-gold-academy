'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'
import { format, formatDistanceToNow, isFuture, addHours } from 'date-fns'
import type { LiveSession } from '@/types/database'

export default function StudentLiveSessionsPage() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<(LiveSession & { teacher?: { display_name: string | null } })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadSessions = useCallback(async () => {
    if (!profile?.id || !profile.classroom_id) return

    try {
      const { data } = await supabase
        .from('live_sessions')
        .select(`
          *,
          teacher:profiles!live_sessions_teacher_id_fkey(id, display_name, avatar_url)
        `)
        .eq('classroom_id', profile.classroom_id)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_start', { ascending: true })

      // Type assertion needed until Supabase types are regenerated after migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSessions((data || []) as any)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, profile?.classroom_id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadSessions()
    }
  }, [profile?.id, loadSessions])

  // Separate live from upcoming
  const liveSessions = sessions.filter(s => s.status === 'live')
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && isFuture(new Date(s.scheduled_start)))

  // Check if session is starting soon (within 1 hour)
  const isStartingSoon = (start: string) => {
    const startTime = new Date(start)
    const oneHourFromNow = addHours(new Date(), 1)
    return isFuture(startTime) && startTime <= oneHourFromNow
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-[var(--glass-surface-border)] rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!profile?.classroom_id) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center py-12">
          <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)]">videocam</span>
          <h2 className="text-xl font-semibold mb-2">Join a Strategy First</h2>
          <p className="text-[var(--muted)]">
            Enroll in a trading strategy to access live sessions.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Live Sessions</h1>
        <p className="text-[var(--muted)]">Join your teacher&apos;s live trading sessions</p>
      </div>

      {/* Live Now */}
      {liveSessions.length > 0 && (
        <div className="space-y-3">
          {liveSessions.map(session => (
            <Card key={session.id} className="border-red-500 bg-red-500/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-lg text-red-500 animate-pulse">radio_button_checked</span>
                <span className="text-sm font-semibold text-red-500">LIVE NOW</span>
              </div>

              <h2 className="text-xl font-bold mb-2">{session.title}</h2>
              {session.description && (
                <p className="text-[var(--muted)] mb-4">{session.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-4">
                <span>with {session.teacher?.display_name || 'Teacher'}</span>
                <span>Started {formatDistanceToNow(new Date(session.actual_start || session.scheduled_start))} ago</span>
              </div>

              {session.stream_url ? (
                <a href={session.stream_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full sm:w-auto">
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                    Join Live Session
                  </Button>
                </a>
              ) : (
                <p className="text-sm text-[var(--muted)]">Waiting for stream link...</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Upcoming Sessions</h2>

        {upcomingSessions.length === 0 ? (
          <Card className="text-center py-12">
            <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)]">calendar_today</span>
            <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
            <p className="text-[var(--muted)]">
              Check back later for scheduled live sessions.
            </p>
          </Card>
        ) : (
          upcomingSessions.map(session => {
            const startingSoon = isStartingSoon(session.scheduled_start)

            return (
              <Card key={session.id} className={startingSoon ? 'border-[var(--gold)]' : ''}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{session.title}</h3>
                      {startingSoon && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--gold)]/20 text-[var(--gold)]">
                          Starting Soon
                        </span>
                      )}
                    </div>

                    {session.description && (
                      <p className="text-sm text-[var(--muted)] mb-3">{session.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {format(new Date(session.scheduled_start), 'EEEE, MMMM d')}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {format(new Date(session.scheduled_start), 'h:mm a')}
                      </span>
                      <span>{session.scheduled_duration_minutes} minutes</span>
                    </div>

                    <p className="text-sm mt-2">
                      <span className="text-[var(--muted)]">with </span>
                      <span className="font-medium">{session.teacher?.display_name || 'Teacher'}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--gold)]">
                      {formatDistanceToNow(new Date(session.scheduled_start), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Tips */}
      <Card>
        <h3 className="font-semibold mb-2">Session Tips</h3>
        <ul className="text-sm text-[var(--muted)] space-y-1 list-disc list-inside">
          <li>Sessions are scheduled in your local timezone</li>
          <li>Click &quot;Join Live Session&quot; when the stream goes live</li>
          <li>Have questions ready to ask during Q&A</li>
          <li>Recordings may be available in the Learn section after</li>
        </ul>
      </Card>
    </div>
  )
}
