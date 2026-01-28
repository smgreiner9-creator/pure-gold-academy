'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { TopicSelector } from './TopicSelector'
import type { LessonContentType } from '@/types/database'

const CONTENT_TYPES: { type: LessonContentType; icon: string; label: string }[] = [
  { type: 'video', icon: 'play_circle', label: 'Video' },
  { type: 'chart', icon: 'candlestick_chart', label: 'Chart' },
  { type: 'pdf', icon: 'description', label: 'PDF' },
  { type: 'text', icon: 'article', label: 'Text' },
]

export function LessonForm() {
  const { profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const [selectedTopicId, setSelectedTopicId] = useState('')

  // Pre-select topic from URL query param (e.g. from topic detail page)
  useEffect(() => {
    const topicId = searchParams.get('topicId')
    if (topicId && !selectedTopicId) {
      setSelectedTopicId(topicId)
    }
  }, [searchParams, selectedTopicId])
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<LessonContentType>('video')
  const [contentUrl, setContentUrl] = useState('')
  const [contentText, setContentText] = useState('')
  const [explanation, setExplanation] = useState('')
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [attachmentNames, setAttachmentNames] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePrimaryFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('learn-content')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('learn-content')
        .getPublicUrl(fileName)

      setContentUrl(publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [profile?.id, supabase])

  const handleAttachmentUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setIsUploadingAttachment(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}-attachment.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('lesson-attachments')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('lesson-attachments')
        .getPublicUrl(fileName)

      setAttachmentUrls(prev => [...prev, publicUrl])
      setAttachmentNames(prev => [...prev, file.name])
    } catch (err) {
      console.error('Attachment upload error:', err)
      setError('Failed to upload attachment. Please try again.')
    } finally {
      setIsUploadingAttachment(false)
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = ''
      }
    }
  }, [profile?.id, supabase])

  const removeAttachment = useCallback((index: number) => {
    setAttachmentUrls(prev => prev.filter((_, i) => i !== index))
    setAttachmentNames(prev => prev.filter((_, i) => i !== index))
  }, [])

  const canSubmit = selectedTopicId && title.trim() && explanation.trim()

  const handleSubmit = useCallback(async (status: 'draft' | 'published') => {
    if (!profile?.id || !canSubmit) return

    setIsSaving(true)
    setError('')

    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: selectedTopicId,
          title: title.trim(),
          content_type: contentType,
          content_url: contentUrl || null,
          content_text: contentText || null,
          explanation: explanation.trim(),
          status,
          attachment_urls: attachmentUrls,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save lesson')
      }

      router.push(`/teacher/topics/${selectedTopicId}`)
    } catch (err) {
      console.error('Error saving lesson:', err)
      setError(err instanceof Error ? err.message : 'Failed to save lesson. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [profile?.id, canSubmit, selectedTopicId, title, contentType, contentUrl, contentText, explanation, attachmentUrls, router])

  const getFileAccept = () => {
    switch (contentType) {
      case 'video': return 'video/*'
      case 'chart': return 'image/*'
      case 'pdf': return 'application/pdf'
      default: return '*/*'
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Add Lesson</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Create a lesson and assign it to a topic</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {/* Topic Selector */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          Topic *
        </label>
        <TopicSelector
          selectedTopicId={selectedTopicId}
          onTopicSelect={setSelectedTopicId}
        />
      </div>

      {/* Lesson Title */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          Lesson Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "Understanding Support & Resistance"'
          className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
        />
      </div>

      {/* Content Type Picker */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          Content Type
        </label>
        <div className="grid grid-cols-4 gap-3">
          {CONTENT_TYPES.map(({ type, icon, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setContentType(type)
                setContentUrl('')
                setContentText('')
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                contentType === type
                  ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]'
                  : 'border-[var(--card-border)] bg-black/20 text-[var(--muted)] hover:border-[var(--gold)]/30 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{icon}</span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Adaptive Content Input */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          {contentType === 'text' ? 'Content' : contentType === 'video' ? 'Video URL' : contentType === 'chart' ? 'Chart Image' : 'PDF File'}
        </label>

        {contentType === 'text' ? (
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Write your lesson content here..."
            rows={8}
            className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
          />
        ) : contentType === 'video' ? (
          <input
            type="text"
            value={contentUrl}
            onChange={(e) => setContentUrl(e.target.value)}
            placeholder="Paste YouTube or Vimeo URL..."
            className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          />
        ) : (
          <div className="space-y-2">
            {contentUrl && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 text-sm">
                <span className="material-symbols-outlined text-[var(--success)] text-lg">check_circle</span>
                <span className="text-[var(--success)] truncate flex-1">File uploaded</span>
                <button
                  type="button"
                  onClick={() => setContentUrl('')}
                  className="text-[var(--muted)] hover:text-white"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={getFileAccept()}
              onChange={handlePrimaryFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full h-24 rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-[var(--gold)]/30 transition-colors flex flex-col items-center justify-center gap-2 text-[var(--muted)] hover:text-white disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  <span className="text-xs">Uploading...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">upload</span>
                  <span className="text-xs">
                    {contentType === 'chart' ? 'Upload chart image' : 'Upload PDF file'}
                  </span>
                </>
              )}
            </button>
            {contentType === 'chart' && (
              <input
                type="text"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="Or paste TradingView / image URL..."
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
              />
            )}
          </div>
        )}
      </div>

      {/* Explanation (Always Present) */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          Explanation *
        </label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain the lesson, add context, key takeaways, or teaching notes..."
          rows={5}
          className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
        />
        <p className="text-[10px] text-[var(--muted)] mt-1">
          Your commentary and teaching notes for this lesson
        </p>
      </div>

      {/* Attachments */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          Attachments (optional)
        </label>

        {attachmentNames.length > 0 && (
          <div className="space-y-2 mb-3">
            {attachmentNames.map((name, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 text-sm">
                <span className="material-symbols-outlined text-[var(--gold)] text-lg">attach_file</span>
                <span className="truncate flex-1">{name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={attachmentInputRef}
          type="file"
          accept="application/pdf,image/*"
          onChange={handleAttachmentUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => attachmentInputRef.current?.click()}
          disabled={isUploadingAttachment}
          className="w-full h-16 rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-[var(--gold)]/30 transition-colors flex items-center justify-center gap-2 text-[var(--muted)] hover:text-white disabled:opacity-50"
        >
          {isUploadingAttachment ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">attach_file</span>
              <span className="text-xs">Add PDF or image attachment</span>
            </>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 pb-24 md:pb-8">
        <button
          onClick={() => handleSubmit('draft')}
          disabled={isSaving || !canSubmit}
          className="flex-1 h-12 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-lg">draft</span>
          )}
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit('published')}
          disabled={isSaving || !canSubmit}
          className="flex-1 gold-gradient text-black font-bold h-12 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
        >
          {isSaving ? (
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-lg">publish</span>
          )}
          Publish Lesson
        </button>
      </div>
    </div>
  )
}
