'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, Button } from '@/components/ui'
import { ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { LearnContent } from '@/types/database'

interface ContentViewerProps {
  content: LearnContent
}

export function ContentViewer({ content }: ContentViewerProps) {
  const router = useRouter()
  const { profile, isPremium } = useAuth()
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

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

  // Check premium access
  if (content.is_premium && !isPremium) {
    return (
      <Card className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Premium Content</h2>
        <p className="text-[var(--muted)] mb-6">
          Upgrade to Premium to access this content
        </p>
        <Button onClick={() => router.push('/settings/subscription')}>
          Upgrade Now
        </Button>
      </Card>
    )
  }

  const renderContent = () => {
    switch (content.content_type) {
      case 'video':
        return (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {content.content_url?.includes('youtube.com') || content.content_url?.includes('youtu.be') ? (
              <iframe
                src={content.content_url.replace('watch?v=', 'embed/')}
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

      case 'pdf':
        return (
          <div className="space-y-4">
            <iframe
              src={content.content_url || ''}
              className="w-full h-[70vh] rounded-lg border border-[var(--card-border)]"
            />
            <a
              href={content.content_url || ''}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[var(--gold)] hover:underline"
            >
              <ExternalLink size={16} />
              Open in new tab
            </a>
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            {content.content_url && (
              <div className="relative w-full overflow-hidden rounded-lg border border-[var(--card-border)]">
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
              <div className="p-4 rounded-lg border border-[var(--card-border)] bg-black/30">
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
              dangerouslySetInnerHTML={{ __html: content.content_text || '' }}
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
          <ArrowLeft size={18} />
          Back
        </Button>
        {isCompleted ? (
          <span className="flex items-center gap-2 text-[var(--success)]">
            <CheckCircle size={18} />
            Completed
          </span>
        ) : (
          <Button onClick={markComplete} isLoading={isLoading}>
            <CheckCircle size={18} />
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
