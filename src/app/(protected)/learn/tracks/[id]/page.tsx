'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'
import type {
  CurriculumTrack,
  TrackModule,
  TrackProgress,
  LearnContent,
  LearnProgress,
  DifficultyLevel
} from '@/types/database'

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: 'bg-green-500/20 text-green-400',
  intermediate: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-red-500/20 text-red-400',
}

type ModuleWithContent = TrackModule & {
  content: LearnContent[]
  completedCount: number
  totalCount: number
}

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, isPremium } = useAuth()
  const router = useRouter()
  const [track, setTrack] = useState<CurriculumTrack | null>(null)
  const [modules, setModules] = useState<ModuleWithContent[]>([])
  const [trackProgress, setTrackProgress] = useState<TrackProgress | null>(null)
  const [contentProgress, setContentProgress] = useState<Record<string, LearnProgress>>({})
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    if (!profile?.id || !id) return

    setIsLoading(true)
    try {
      // Load track details
      const { data: trackData, error: trackError } = await supabase
        .from('curriculum_tracks')
        .select('*')
        .eq('id', id)
        .single()

      if (trackError || !trackData) {
        console.error('Track not found:', trackError)
        router.push('/learn')
        return
      }

      // Verify student has access (same classroom)
      if (trackData.classroom_id !== profile.classroom_id) {
        router.push('/learn')
        return
      }

      setTrack(trackData)

      // Check if track is unlocked (prerequisite completed)
      if (trackData.prerequisite_track_id) {
        const { data: prereqProgress } = await supabase
          .from('track_progress')
          .select('*')
          .eq('user_id', profile.id)
          .eq('track_id', trackData.prerequisite_track_id)
          .single()

        if (!prereqProgress?.completed_at) {
          router.push('/learn')
          return
        }
      }

      // Load modules with their content
      const { data: modulesData } = await supabase
        .from('track_modules')
        .select('*')
        .eq('track_id', id)
        .order('order_index')

      // Load all content for this track's modules
      const moduleIds = modulesData?.map(m => m.id) || []
      const contentByModule: Record<string, LearnContent[]> = {}

      if (moduleIds.length > 0) {
        const { data: contentData } = await supabase
          .from('learn_content')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index')

        // Group content by module
        contentData?.forEach(c => {
          if (!contentByModule[c.module_id!]) {
            contentByModule[c.module_id!] = []
          }
          contentByModule[c.module_id!].push(c)
        })
      }

      // Load content progress
      const allContentIds = Object.values(contentByModule).flat().map(c => c.id)
      const progressMap: Record<string, LearnProgress> = {}

      if (allContentIds.length > 0) {
        const { data: progressData } = await supabase
          .from('learn_progress')
          .select('*')
          .eq('user_id', profile.id)
          .in('content_id', allContentIds)

        progressData?.forEach(p => {
          progressMap[p.content_id] = p
        })
      }

      setContentProgress(progressMap)

      // Build modules with content and progress counts
      const modulesWithContent: ModuleWithContent[] = (modulesData || []).map(m => {
        const moduleContent = contentByModule[m.id] || []
        const completedCount = moduleContent.filter(c => progressMap[c.id]?.completed).length
        return {
          ...m,
          content: moduleContent,
          completedCount,
          totalCount: moduleContent.length
        }
      })

      setModules(modulesWithContent)

      // Auto-expand first incomplete module or first module
      const firstIncomplete = modulesWithContent.find(m => m.completedCount < m.totalCount)
      if (firstIncomplete) {
        setExpandedModules(new Set([firstIncomplete.id]))
      } else if (modulesWithContent.length > 0) {
        setExpandedModules(new Set([modulesWithContent[0].id]))
      }

      // Load track progress
      const { data: trackProgressData } = await supabase
        .from('track_progress')
        .select('*')
        .eq('user_id', profile.id)
        .eq('track_id', id)
        .single()

      setTrackProgress(trackProgressData)

    } catch (error) {
      console.error('Error loading track:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, profile?.classroom_id, id, supabase, router])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  // Calculate overall progress
  const totalContent = modules.reduce((sum, m) => sum + m.totalCount, 0)
  const completedContent = modules.reduce((sum, m) => sum + m.completedCount, 0)
  const overallProgress = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0

  // Find next content to continue
  const nextContent = useMemo(() => {
    for (const trackModule of modules) {
      for (const content of trackModule.content) {
        if (!contentProgress[content.id]?.completed) {
          return { module: trackModule, content }
        }
      }
    }
    return null
  }, [modules, contentProgress])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[var(--glass-surface-border)] rounded animate-pulse" />
        <div className="h-32 glass-surface rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 glass-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)]">layers</span>
        <h2 className="text-xl font-semibold mb-2">Track Not Found</h2>
        <p className="text-[var(--muted)] mb-4">This learning track doesn&apos;t exist or you don&apos;t have access.</p>
        <Link href="/learn">
          <Button>Back to Learn</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link href="/learn" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        <span>Back to Learn</span>
      </Link>

      {/* Track Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{track.name}</h1>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[track.difficulty_level]}`}>
              {track.difficulty_level}
            </span>
            {trackProgress?.completed_at && (
              <span className="material-symbols-outlined text-xl text-[var(--success)]">check_circle</span>
            )}
          </div>
          {track.description && (
            <p className="text-[var(--muted)] mb-4">{track.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">auto_stories</span>
              {modules.length} {modules.length === 1 ? 'module' : 'modules'}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">layers</span>
              {totalContent} {totalContent === 1 ? 'lesson' : 'lessons'}
            </span>
            {track.estimated_hours && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">schedule</span>
                ~{track.estimated_hours} hours
              </span>
            )}
          </div>
        </div>

        {/* Progress Card */}
        <Card className="lg:w-80 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--muted)]">Your Progress</span>
            <span className="text-xl font-bold text-[var(--gold)]">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-[var(--gold)] rounded-full transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-sm text-[var(--muted)] mb-4">
            {completedContent} of {totalContent} lessons completed
          </p>

          {nextContent ? (
            <Link href={`/learn/${nextContent.content.id}`}>
              <Button className="w-full">
                <span className="material-symbols-outlined text-base">play_arrow</span>
                {completedContent === 0 ? 'Start Learning' : 'Continue Learning'}
              </Button>
            </Link>
          ) : totalContent > 0 ? (
            <div className="flex items-center justify-center gap-2 py-2 text-[var(--success)]">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span className="font-medium">Track Completed!</span>
            </div>
          ) : (
            <p className="text-sm text-center text-[var(--muted)]">No content available yet</p>
          )}
        </Card>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Modules</h2>

        {modules.length === 0 ? (
          <Card className="text-center py-8">
            <span className="material-symbols-outlined text-4xl mx-auto mb-3 text-[var(--muted)]">auto_stories</span>
            <p className="text-[var(--muted)]">No modules have been added to this track yet.</p>
          </Card>
        ) : (
          modules.map((module, index) => {
            const isExpanded = expandedModules.has(module.id)
            const isComplete = module.completedCount === module.totalCount && module.totalCount > 0
            const progressPercent = module.totalCount > 0
              ? Math.round((module.completedCount / module.totalCount) * 100)
              : 0

            return (
              <Card key={module.id} className="overflow-hidden">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center gap-4 text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    isComplete
                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : 'bg-[var(--gold)]/10 text-[var(--gold)]'
                  }`}>
                    {isComplete ? <span className="material-symbols-outlined text-lg">check_circle</span> : index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{module.title}</h3>
                    {module.summary && (
                      <p className="text-sm text-[var(--muted)] line-clamp-1">{module.summary}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[var(--muted)] mt-1">
                      <span>{module.totalCount} {module.totalCount === 1 ? 'lesson' : 'lessons'}</span>
                      {progressPercent > 0 && progressPercent < 100 && (
                        <span className="text-[var(--gold)]">{progressPercent}% complete</span>
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <span className="material-symbols-outlined text-xl text-[var(--muted)]">expand_more</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl text-[var(--muted)]">chevron_right</span>
                  )}
                </button>

                {/* Module Content */}
                {isExpanded && module.content.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--glass-surface-border)] space-y-3">
                    {module.content.map((content, contentIndex) => {
                      const progress = contentProgress[content.id]
                      const isContentComplete = progress?.completed
                      const isLocked = content.is_premium && !isPremium

                      return (
                        <Link
                          key={content.id}
                          href={isLocked ? '/settings/subscription' : `/learn/${content.id}`}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                            isLocked
                              ? 'opacity-60 bg-black/20'
                              : 'hover:bg-black/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                            isContentComplete
                              ? 'bg-[var(--success)]/10 text-[var(--success)]'
                              : 'bg-black/5 text-[var(--muted)]'
                          }`}>
                            {isLocked ? (
                              <span className="material-symbols-outlined text-sm">lock</span>
                            ) : isContentComplete ? (
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                            ) : (
                              contentIndex + 1
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{content.title}</p>
                            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                              <span className="capitalize">{content.content_type}</span>
                              {content.is_premium && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--gold)]/10 text-[var(--gold)]">
                                  Premium
                                </span>
                              )}
                            </div>
                          </div>

                          {progress && !isContentComplete && progress.progress_percent > 0 && (
                            <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--gold)] rounded-full"
                                style={{ width: `${progress.progress_percent}%` }}
                              />
                            </div>
                          )}

                          <span className="material-symbols-outlined text-base text-[var(--muted)]">chevron_right</span>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {isExpanded && module.content.length === 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--glass-surface-border)] text-center py-4">
                    <p className="text-sm text-[var(--muted)]">No lessons in this module yet.</p>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
