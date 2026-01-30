'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'
import { ContentCard } from '@/components/learn/ContentCard'
import { TradeCallCard } from '@/components/trade-calls'
import { PageHeader } from '@/components/layout/PageHeader'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { format, formatDistanceToNow } from 'date-fns'
import type {
  LearnContent,
  LearnProgress,
  Lesson,
  ClassroomRule,
  CurriculumTrack,
  TrackProgress,
  TradeCall,
  LiveSession,
  Classroom,
  DifficultyLevel
} from '@/types/database'

type TabType = 'overview' | 'tracks' | 'trade-calls' | 'live'

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-red-500/20 text-red-400',
}

export default function LearnPage() {
  const { profile, isPremium } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [content, setContent] = useState<LearnContent[]>([])
  const [, setLessons] = useState<Lesson[]>([])
  const [rules, setRules] = useState<ClassroomRule[]>([])
  const [progress, setProgress] = useState<Record<string, LearnProgress>>({})
  const [tracks, setTracks] = useState<CurriculumTrack[]>([])
  const [trackProgress, setTrackProgress] = useState<Record<string, TrackProgress>>({})
  const [tradeCalls, setTradeCalls] = useState<(TradeCall & { teacher?: { display_name: string | null } })[]>([])
  const [liveSessions, setLiveSessions] = useState<(LiveSession & { teacher?: { display_name: string | null } })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    if (!profile?.id || !profile.classroom_id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Load all data in parallel
      const [
        classroomRes,
        contentRes,
        progressRes,
        lessonsRes,
        rulesRes,
        tracksRes,
        trackProgressRes,
        tradeCallsRes,
        liveSessionsRes
      ] = await Promise.all([
        supabase.from('classrooms').select('*').eq('id', profile.classroom_id).single(),
        supabase.from('learn_content').select('*').eq('classroom_id', profile.classroom_id).order('order_index'),
        supabase.from('learn_progress').select('*').eq('user_id', profile.id),
        supabase.from('lessons').select('*').eq('classroom_id', profile.classroom_id).order('order_index'),
        supabase.from('classroom_rules').select('*').eq('classroom_id', profile.classroom_id).order('order_index'),
        supabase.from('curriculum_tracks').select('*').eq('classroom_id', profile.classroom_id).eq('is_published', true).order('order_index'),
        supabase.from('track_progress').select('*').eq('user_id', profile.id),
        supabase.from('trade_calls').select('*, teacher:profiles!trade_calls_teacher_id_fkey(display_name)').eq('classroom_id', profile.classroom_id).order('published_at', { ascending: false }).limit(10),
        supabase.from('live_sessions').select('*, teacher:profiles!live_sessions_teacher_id_fkey(display_name)').eq('classroom_id', profile.classroom_id).in('status', ['scheduled', 'live']).gte('scheduled_start', new Date(Date.now() - 3600000).toISOString()).order('scheduled_start').limit(5),
      ])

      setClassroom(classroomRes.data)
      setContent(contentRes.data || [])
      setLessons(lessonsRes.data || [])
      setRules(rulesRes.data || [])
      setTracks(tracksRes.data || [])
      // Type assertion needed until Supabase types are regenerated after migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTradeCalls((tradeCallsRes.data || []) as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLiveSessions((liveSessionsRes.data || []) as any)

      // Build progress maps
      if (progressRes.data) {
        const map: Record<string, LearnProgress> = {}
        progressRes.data.forEach(p => { map[p.content_id] = p })
        setProgress(map)
      }
      if (trackProgressRes.data) {
        const map: Record<string, TrackProgress> = {}
        trackProgressRes.data.forEach(p => { map[p.track_id] = p })
        setTrackProgress(map)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, profile?.classroom_id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  const handleCopyToJournal = (tradeCall: TradeCall) => {
    // Navigate to journal with pre-filled data
    router.push(`/journal/new?instrument=${tradeCall.instrument}&direction=${tradeCall.direction}&entry=${tradeCall.entry_price}&sl=${tradeCall.stop_loss}&tp=${tradeCall.take_profit_1 || ''}`)
  }

  // Calculate stats
  const completedCount = useMemo(() => content.filter(c => progress[c.id]?.completed).length, [content, progress])
  const totalCount = content.length
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Filter content for traditional view
  const filteredContent = useMemo(() => {
    return content.filter(c => {
      if (filter === 'completed') return progress[c.id]?.completed
      if (filter === 'in-progress') return progress[c.id] && !progress[c.id].completed
      if (filter === 'not-started') return !progress[c.id]
      return true
    })
  }, [content, filter, progress])

  // Get active trade calls
  const activeTradeCalls = tradeCalls.filter(c => c.status === 'active')
  const recentClosedCalls = tradeCalls.filter(c => c.status !== 'active').slice(0, 3)

  // Get live and upcoming sessions
  const liveSes = liveSessions.filter(s => s.status === 'live')
  const upcomingSes = liveSessions.filter(s => s.status === 'scheduled')

  // Check if track is unlocked (prerequisite completed)
  const isTrackUnlocked = (track: CurriculumTrack) => {
    if (!track.prerequisite_track_id) return true
    const prereqProgress = trackProgress[track.prerequisite_track_id]
    return prereqProgress?.completed_at !== null
  }

  const learnTabs = [
    { key: 'overview', label: 'Overview', icon: 'target' },
    ...(tracks.length > 0 ? [{ key: 'tracks', label: 'Tracks', icon: 'layers' }] : []),
    { key: 'trade-calls', label: 'Trade Calls', icon: 'trending_up' },
    { key: 'live', label: 'Live', icon: 'videocam' },
  ]

  if (isLoading) {
    return (
      <div className="content-grid">
        <div className="col-span-full h-24 glass-surface animate-pulse" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 glass-surface animate-pulse" />
        ))}
      </div>
    )
  }

  if (!profile?.classroom_id) {
    return (
      <div className="content-grid">
        <div className="col-span-full glass-surface p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[var(--gold)]">school</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Join a Classroom</h2>
          <p className="text-[var(--muted)] text-sm mb-6">Join a classroom to access lessons, trade calls, and learning content from your teacher.</p>
          <Link
            href="/classroom/join"
            className="btn-gold h-10 px-6 rounded-lg inline-flex items-center gap-2 text-sm"
          >
            Join a Classroom
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={classroom?.name || 'Learn'}
        subtitle={classroom?.description || 'Your learning dashboard'}
        tabs={learnTabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as TabType)}
      />

      <div className="content-grid">
        <div className="col-span-full">
          <MobileTabBar tabs={learnTabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as TabType)} />
        </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="col-span-full space-y-6">
          {/* Progress Card */}
          <Card interactive className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-[var(--gold)]">auto_stories</span>
              </div>
              <div>
                <p className="font-bold">Your Progress</p>
                <p className="text-sm text-[var(--muted)]">{completedCount} of {totalCount} items completed</p>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[var(--muted)]">Completion</span>
                <span className="font-bold text-[var(--gold)]">{overallProgress}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--gold)] rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
          </Card>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Learning Tracks Preview */}
            {tracks.length > 0 && (
              <Card interactive className="cursor-pointer" onClick={() => setActiveTab('tracks')}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Learning Tracks</h3>
                  <span className="material-symbols-outlined text-lg text-[var(--muted)]">chevron_right</span>
                </div>
                <p className="text-sm text-[var(--muted)] mb-3">{tracks.length} structured learning paths</p>
                <div className="flex gap-1">
                  {tracks.slice(0, 3).map(t => (
                    <span key={t.id} className={`px-2 py-0.5 rounded text-xs ${difficultyColors[t.difficulty_level]}`}>
                      {t.name.slice(0, 12)}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Active Trade Calls Preview */}
            <Card interactive className="cursor-pointer" onClick={() => setActiveTab('trade-calls')}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Trade Calls</h3>
                <span className="material-symbols-outlined text-lg text-[var(--muted)]">chevron_right</span>
              </div>
              <p className="text-sm text-[var(--muted)] mb-3">
                {activeTradeCalls.length} active {activeTradeCalls.length === 1 ? 'call' : 'calls'}
              </p>
              {activeTradeCalls.length > 0 ? (
                <div className="text-sm">
                  <span className={activeTradeCalls[0].direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                    {activeTradeCalls[0].direction.toUpperCase()}
                  </span>
                  {' '}{activeTradeCalls[0].instrument}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">No active calls</p>
              )}
            </Card>

            {/* Live Sessions Preview */}
            <Card interactive className="cursor-pointer" onClick={() => setActiveTab('live')}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  Live Sessions
                  {liveSes.length > 0 && <span className="material-symbols-outlined text-sm text-red-500 animate-pulse">radio_button_checked</span>}
                </h3>
                <span className="material-symbols-outlined text-lg text-[var(--muted)]">chevron_right</span>
              </div>
              {liveSes.length > 0 ? (
                <p className="text-sm text-red-500 font-medium">Live now!</p>
              ) : upcomingSes.length > 0 ? (
                <div className="text-sm text-[var(--muted)]">
                  <p>Next: {upcomingSes[0].title}</p>
                  <p className="text-xs">{formatDistanceToNow(new Date(upcomingSes[0].scheduled_start), { addSuffix: true })}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">No upcoming sessions</p>
              )}
            </Card>
          </div>

          {/* Strategy Rules */}
          {rules.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-[var(--gold)]">target</span>
                </div>
                <div>
                  <h2 className="font-bold">Strategy Rules</h2>
                  <p className="text-sm text-[var(--muted)]">Follow these to stay consistent</p>
                </div>
              </div>
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="p-3 rounded-xl bg-black/[0.03]">
                    <p className="font-semibold text-sm">{rule.rule_text}</p>
                    {rule.description && <p className="text-sm text-[var(--muted)]">{rule.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent Content</h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-field rounded-xl px-4 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {filteredContent.length === 0 ? (
              <Card className="text-center py-8">
                <span className="material-symbols-outlined text-4xl mx-auto mb-3 text-[var(--muted)] block">auto_stories</span>
                <p className="text-[var(--muted)]">
                  {content.length === 0 ? 'No content available yet' : 'No content matches filter'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredContent.slice(0, 6).map(c => (
                  <ContentCard key={c.id} content={c} progress={progress[c.id]} isPremiumUser={isPremium} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TRACKS TAB */}
      {activeTab === 'tracks' && (
        <div className="col-span-full space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Learning Tracks</h2>
            <p className="text-[var(--muted)]">Structured paths to master trading concepts</p>
          </div>

          {tracks.length === 0 ? (
            <Card className="text-center py-12">
              <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)] block">layers</span>
              <h3 className="text-lg font-semibold mb-2">No Tracks Available</h3>
              <p className="text-[var(--muted)]">Your teacher hasn&apos;t published any learning tracks yet.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tracks.map((track, index) => {
                const unlocked = isTrackUnlocked(track)
                const tp = trackProgress[track.id]
                const progressPercent = tp?.progress_percent || 0

                return (
                  <Card
                    key={track.id}
                    interactive={unlocked}
                    className={`relative overflow-hidden ${!unlocked ? 'opacity-60' : 'cursor-pointer'}`}
                    onClick={() => unlocked && router.push(`/learn/tracks/${track.id}`)}
                  >
                    {/* Progress bar at top */}
                    {unlocked && progressPercent > 0 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-black/40">
                        <div className="h-full bg-[var(--gold)]" style={{ width: `${progressPercent}%` }} />
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center text-lg font-bold">
                        {unlocked ? index + 1 : <span className="material-symbols-outlined text-xl text-[var(--muted)]">lock</span>}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{track.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs ${difficultyColors[track.difficulty_level]}`}>
                            {track.difficulty_level}
                          </span>
                          {tp?.completed_at && (
                            <span className="material-symbols-outlined text-base text-[var(--success)]">check_circle</span>
                          )}
                        </div>
                        {track.description && (
                          <p className="text-sm text-[var(--muted)] mb-2 line-clamp-2">{track.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                          {track.estimated_hours && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {track.estimated_hours} hours
                            </span>
                          )}
                          {unlocked && progressPercent > 0 && (
                            <span className="text-[var(--gold)]">{progressPercent}% complete</span>
                          )}
                        </div>
                      </div>

                      {unlocked && (
                        <span className="material-symbols-outlined text-xl text-[var(--muted)]">chevron_right</span>
                      )}
                    </div>

                    {!unlocked && (
                      <div className="mt-3 p-2 bg-[var(--muted)]/10 rounded text-xs text-[var(--muted)]">
                        Complete {tracks.find(t => t.id === track.prerequisite_track_id)?.name} to unlock
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TRADE CALLS TAB */}
      {activeTab === 'trade-calls' && (
        <div className="col-span-full space-y-6">
          {/* Active Calls */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-[var(--gold)]">target</span>
              Active Trade Calls
            </h2>
            {activeTradeCalls.length === 0 ? (
              <Card className="text-center py-8">
                <span className="material-symbols-outlined text-4xl mx-auto mb-3 text-[var(--muted)] block">trending_up</span>
                <p className="text-[var(--muted)]">No active trade calls right now</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeTradeCalls.map(call => (
                  <TradeCallCard
                    key={call.id}
                    tradeCall={call}
                    onCopyToJournal={handleCopyToJournal}
                    isTeacher={false}
                    showActions={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Closed */}
          {recentClosedCalls.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--muted)]">Recent Results</h2>
              <div className="space-y-4">
                {recentClosedCalls.map(call => (
                  <TradeCallCard
                    key={call.id}
                    tradeCall={call}
                    isTeacher={false}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIVE TAB */}
      {activeTab === 'live' && (
        <div className="col-span-full space-y-6">
          {/* Live Now */}
          {liveSes.length > 0 && (
            <div className="space-y-4">
              {liveSes.map(session => (
                <Card key={session.id} className="border-red-500 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-lg text-red-500 animate-pulse">radio_button_checked</span>
                    <span className="text-sm font-semibold text-red-500">LIVE NOW</span>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{session.title}</h2>
                  {session.description && <p className="text-[var(--muted)] mb-4">{session.description}</p>}
                  {session.stream_url ? (
                    <a href={session.stream_url} target="_blank" rel="noopener noreferrer">
                      <Button>
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                        Join Session
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
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Upcoming Sessions</h2>
            {upcomingSes.length === 0 ? (
              <Card className="text-center py-12">
                <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)] block">calendar_today</span>
                <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
                <p className="text-[var(--muted)]">Check back later for scheduled live streams.</p>
              </Card>
            ) : (
              upcomingSes.map(session => (
                <Card key={session.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-[var(--muted)] mb-3">{session.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          {format(new Date(session.scheduled_start), 'EEEE, MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {format(new Date(session.scheduled_start), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--gold)]">
                        {formatDistanceToNow(new Date(session.scheduled_start), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Link href="/learn/live">
            <Button variant="glass" className="w-full">
              View All Sessions
            </Button>
          </Link>
        </div>
      )}
    </div>
    </>
  )
}
