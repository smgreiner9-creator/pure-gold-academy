'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { ContentViewer } from '@/components/learn/ContentViewer'
import type { LearnContent } from '@/types/database'

export default function ContentPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<LearnContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const contentId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined

  useEffect(() => {
    if (contentId) {
      loadContent()
    }
  }, [contentId])

  const loadContent = async () => {
    if (!contentId) return

    try {
      const { data, error } = await supabase
        .from('learn_content')
        .select('*')
        .eq('id', contentId)
        .single()

      if (error) throw error
      setContent(data)
    } catch (error) {
      console.error('Error loading content:', error)
      router.push('/learn')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="animate-pulse h-96" />
      </div>
    )
  }

  if (!content) return null

  return (
    <div className="max-w-4xl mx-auto">
      <ContentViewer content={content} />
    </div>
  )
}
