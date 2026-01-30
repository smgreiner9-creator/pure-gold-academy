'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { Card, Button } from '@/components/ui'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSingleContentAccess } from '@/hooks/useContentAccess'
import type { LearnContent } from '@/types/database'

const ALLOWED_IFRAME_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
]

interface ContentViewerProps {
  content: LearnContent
}

export function ContentViewer({ content }: ContentViewerProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const { hasAccess, isLoading: accessLoading } = useSingleContentAccess(content.id)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const checkProgress = useCallback(async () => {
    if (!profile?.id) return

    const { data } = await supabase
      .from('learn_progress')
      .select('completed')
      .eq('user_id', profile.id)
      .eq('content_id', content.id)
      .single()

    if (data) {
      setIsCompleted(data.completed)
    }
  }, [content.id, profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      checkProgress()
    }
  }, [profile?.id, checkProgress])

  const markComplete = async () => {
    if (!profile?.id) return

    setIsLoading(true)
    try {
      const { data: existing } = await supabase
        .from('learn_progress')
        .select('id')
        .eq('user_id', profile.id)
        .eq('content_id', content.id)
        .single()

      if (existing) {
        await supabase
          .from('learn_progress')
          .update({
            completed: true,
            progress_percent: 100,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('learn_progress').insert({
          user_id: profile.id,
          content_id: content.id,
          completed: true,
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
      }

      setIsCompleted(true)
    } catch (error) {
      console.error('Error marking complete:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check content access
  if (accessLoading) {
    return (
      <Card className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--gold)] animate-spin">progress_activity</span>
        </div>
        <p className="text-[var(--muted)]">Checking access...</p>
      </Card>
    )
  }

  if (!hasAccess) {
    return (
      <Card className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--gold)]">lock</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Locked Content</h2>
        <p className="text-[var(--muted)] mb-4">
          Subscribe to this classroom for full access to all lessons and content.
        </p>
        {content.is_individually_priced && content.price && content.price > 0 && (
          <p className="text-sm text-[var(--muted)] mb-4">
            Price: <span className="font-bold text-[var(--gold)]">${content.price}</span> — Individual lesson purchases coming soon.
          </p>
        )}
        <Button onClick={() => router.push('/settings')}>
          View Classrooms
        </Button>
      </Card>
    )
  }

  const renderContent = () => {
    switch (content.content_type) {
      case 'video': {
        const isValidYouTube = (() => {
          try {
            if (!content.content_url) return false
            const url = new URL(content.content_url)
            return ALLOWED_IFRAME_HOSTS.includes(url.hostname)
          } catch { return false }
        })()

        return (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {isValidYouTube ? (
              <iframe
                src={content.content_url!.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <video
                src={content.content_url || ''}
                controls
                className="w-full h-full"
              />
            )}
          </div>
        )
      }

      case 'pdf': {
        const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          : null
        const isPdfUrlValid = (() => {
          try {
            if (!content.content_url) return false
            const url = new URL(content.content_url)
            return supabaseHost ? url.hostname === supabaseHost : false
          } catch { return false }
        })()

        if (!isPdfUrlValid) {
          return <p className="text-[var(--muted)]">Invalid PDF source.</p>
        }

        return (
          <div className="space-y-4">
            <iframe
              src={content.content_url || ''}
              className="w-full h-[70vh] rounded-lg border border-[var(--glass-surface-border)]"
            />
            <a
              href={content.content_url || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[var(--gold)] hover:underline"
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              Open in new tab
            </a>
          </div>
        )
      }

      case 'image':
        return (
          <div className="space-y-4">
            {content.content_url && (
              <div className="relative w-full overflow-hidden rounded-lg border border-[var(--glass-surface-border)]">
                <Image
                  src={content.content_url}
                  alt={content.title}
                  width={1200}
                  height={800}
                  sizes="100vw"
                  className="w-full h-auto"
                />
              </div>
            )}
            {content.explanation && (
              <div className="p-4 rounded-lg border border-[var(--glass-surface-border)] bg-black/30">
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
                  Explanation
                </p>
                <p className="text-sm">{content.explanation}</p>
              </div>
            )}
          </div>
        )

      case 'text':
        return (
          <div className="prose prose-invert max-w-none">
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.content_text || '') }}
            />
          </div>
        )

      default:
        return <p>Unsupported content type</p>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </Button>
        {isCompleted ? (
          <span className="flex items-center gap-2 text-[var(--success)]">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Completed
          </span>
        ) : (
          <Button onClick={markComplete} isLoading={isLoading}>
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Mark as Complete
          </Button>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">{content.title}</h1>
        {content.description && (
          <p className="text-[var(--muted)] mt-2">{content.description}</p>
        )}
      </div>

      {/* Content */}
      <Card padding="lg">
        {renderContent()}
      </Card>
    </div>
  )
}
