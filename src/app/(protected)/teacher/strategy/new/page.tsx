'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { ContentType, Classroom, Lesson, LearnContent, TeacherStripeAccount } from '@/types/database'

type StepKey = 'strategy' | 'lesson_content' | 'publish'

const steps: { key: StepKey; label: string; description: string }[] = [
  { key: 'strategy', label: 'Create Strategy', description: 'Name and describe your trading strategy.' },
  { key: 'lesson_content', label: 'Lesson + Content', description: 'Add the first lesson and content.' },
  { key: 'publish', label: 'Publish', description: 'Set pricing and visibility.' },
]

export default function StrategyWizardPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [activeStep, setActiveStep] = useState(0)
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [contentItems, setContentItems] = useState<LearnContent[]>([])
  const [stripeAccount, setStripeAccount] = useState<TeacherStripeAccount | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [strategyForm, setStrategyForm] = useState({
    name: '',
    description: '',
  })
  const [lessonForm, setLessonForm] = useState({
    title: '',
    summary: '',
  })
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    content_type: 'pdf' as ContentType,
    content_url: '',
    content_text: '',
    explanation: '',
  })
  const [publishForm, setPublishForm] = useState({
    is_public: true,
    pricing_type: 'free' as 'free' | 'paid',
    monthly_price: '',
    trial_days: '0',
  })

  const loadStripeAccount = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('teacher_stripe_accounts')
      .select('*')
      .eq('teacher_id', profile.id)
      .single()
    setStripeAccount(data || null)
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadStripeAccount()
    }
  }, [profile?.id, loadStripeAccount])

  const handleCreateStrategy = async () => {
    if (!profile?.id || !strategyForm.name.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: profile.id,
          name: strategyForm.name.trim(),
          description: strategyForm.description.trim() || null,
        })
        .select()
        .single()

      if (insertError) throw insertError
      setClassroom(data as Classroom)
      setActiveStep(1)
    } catch (err) {
      console.error('Error creating strategy:', err)
      setError('Failed to create strategy.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateLesson = async () => {
    if (!classroom?.id || !lessonForm.title.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('lessons')
        .insert({
          classroom_id: classroom.id,
          title: lessonForm.title.trim(),
          summary: lessonForm.summary.trim() || null,
          order_index: 0,
        })
        .select()
        .single()

      if (insertError) throw insertError
      setLesson(data as Lesson)
    } catch (err) {
      console.error('Error creating lesson:', err)
      setError('Failed to create lesson.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!profile?.id || !file) return
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

      setContentForm(prev => ({ ...prev, content_url: publicUrl }))
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload file.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddContent = async () => {
    if (!profile?.id || !classroom?.id || !lesson?.id) return
    if (!contentForm.title.trim()) return
    if (contentForm.content_type === 'image' && !contentForm.explanation.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('learn_content')
        .insert({
          classroom_id: classroom.id,
          teacher_id: profile.id,
          lesson_id: lesson.id,
          title: contentForm.title.trim(),
          description: contentForm.description.trim() || null,
          explanation: contentForm.explanation.trim() || null,
          content_type: contentForm.content_type,
          content_url: contentForm.content_url || null,
          content_text: contentForm.content_text || null,
          order_index: contentItems.length,
        })
        .select()
        .single()

      if (insertError) throw insertError
      setContentItems([...contentItems, data as LearnContent])
      setContentForm({
        title: '',
        description: '',
        content_type: 'pdf',
        content_url: '',
        content_text: '',
        explanation: '',
      })
    } catch (err) {
      console.error('Error adding content:', err)
      setError('Failed to add content.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!classroom?.id) return
    if (!lesson?.id || contentItems.length === 0) return

    setIsSaving(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('classrooms')
        .update({ is_public: publishForm.is_public })
        .eq('id', classroom.id)

      if (updateError) throw updateError

      const price = publishForm.pricing_type === 'paid' ? parseFloat(publishForm.monthly_price) : 0
      if (publishForm.pricing_type === 'paid' && (isNaN(price) || price < 1)) {
        throw new Error('Monthly price must be at least $1.00')
      }

      const pricingRes = await fetch('/api/stripe/connect/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroom.id,
          pricing_type: publishForm.pricing_type,
          monthly_price: publishForm.pricing_type === 'paid' ? price : 0,
          trial_days: parseInt(publishForm.trial_days) || 0,
        }),
      })

      if (!pricingRes.ok) {
        const data = await pricingRes.json()
        throw new Error(data.error || 'Failed to save pricing')
      }

      router.push(`/teacher/classrooms/${classroom.id}`)
    } catch (err) {
      console.error('Error publishing strategy:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish strategy.')
    } finally {
      setIsSaving(false)
    }
  }

  const canProceedToPublish = lesson && contentItems.length > 0
  const canSetPaidPricing = stripeAccount?.charges_enabled === true

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Strategy</h1>
          <p className="text-sm text-[var(--muted)]">A guided setup to launch your trading strategy.</p>
        </div>
        <Link href="/teacher/classrooms" className="text-[var(--muted)] hover:text-white text-sm">
          Exit setup
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`p-4 rounded-xl border ${
              index === activeStep
                ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                : 'border-[var(--card-border)] bg-[var(--card-bg)]'
            }`}
          >
            <p className="text-xs text-[var(--muted)] uppercase tracking-widest mb-2">Step {index + 1}</p>
            <p className="font-semibold">{step.label}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{step.description}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {activeStep === 0 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Strategy Name *
            </label>
            <input
              type="text"
              value={strategyForm.name}
              onChange={(e) => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
              placeholder="e.g., London Session Breakout"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Strategy Description
            </label>
            <textarea
              value={strategyForm.description}
              onChange={(e) => setStrategyForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
              placeholder="What do students learn in this strategy?"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreateStrategy}
              disabled={isSaving || !strategyForm.name.trim()}
              className="gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
            >
              {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Continue
            </button>
          </div>
        </div>
      )}

      {activeStep === 1 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] space-y-4">
          <div className="text-sm text-[var(--muted)]">
            Strategy: <span className="text-white font-semibold">{classroom?.name}</span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Lesson Title *
            </label>
            <input
              type="text"
              value={lessonForm.title}
              onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
              placeholder="e.g., Entry Checklist"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Lesson Summary
            </label>
            <textarea
              value={lessonForm.summary}
              onChange={(e) => setLessonForm(prev => ({ ...prev, summary: e.target.value }))}
              rows={3}
              className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
              placeholder="Explain what this lesson covers."
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleCreateLesson}
              disabled={isSaving || !lessonForm.title.trim()}
              className="gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
            >
              {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Save Lesson
            </button>
          </div>
        </div>
      )}

      {activeStep === 1 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] space-y-5">
          <div className="text-sm text-[var(--muted)]">
            Lesson: <span className="text-white font-semibold">{lesson?.title}</span>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                Content Title *
              </label>
              <input
                type="text"
                value={contentForm.title}
                onChange={(e) => setContentForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                disabled={!lesson}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                Description
              </label>
              <textarea
                value={contentForm.description}
                onChange={(e) => setContentForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                disabled={!lesson}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                Content Type
              </label>
              <select
                value={contentForm.content_type}
                onChange={(e) => setContentForm(prev => ({ ...prev, content_type: e.target.value as ContentType }))}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                disabled={!lesson}
              >
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="text">Text</option>
              </select>
            </div>

            {contentForm.content_type === 'text' ? (
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Content
                </label>
                <textarea
                  value={contentForm.content_text}
                  onChange={(e) => setContentForm(prev => ({ ...prev, content_text: e.target.value }))}
                  rows={6}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                  disabled={!lesson}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Content URL or Upload
                </label>
                <input
                  type="text"
                  value={contentForm.content_url}
                  onChange={(e) => setContentForm(prev => ({ ...prev, content_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                  disabled={!lesson}
                />
                <input
                  type="file"
                  accept={
                    contentForm.content_type === 'video' ? 'video/*' :
                    contentForm.content_type === 'pdf' ? 'application/pdf' :
                    contentForm.content_type === 'image' ? 'image/*' : '*/*'
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                  className="w-full text-sm"
                  disabled={!lesson}
                />
                {isUploading && (
                  <p className="text-xs text-[var(--muted)]">Uploading...</p>
                )}
              </div>
            )}

            {contentForm.content_type === 'image' && (
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Explanation *
                </label>
                <textarea
                  value={contentForm.explanation}
                  onChange={(e) => setContentForm(prev => ({ ...prev, explanation: e.target.value }))}
                  rows={4}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                  disabled={!lesson}
                />
              </div>
            )}
          </div>

          {contentItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Added Content</p>
              {contentItems.map(item => (
                <div key={item.id} className="p-3 rounded-xl bg-black/30 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-[var(--muted)]">{item.content_type}</p>
                  </div>
                  <span className="text-xs text-[var(--success)]">Added</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setActiveStep(0)}
              className="h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
            >
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleAddContent}
                disabled={
                  isSaving ||
                  !lesson ||
                  !contentForm.title.trim() ||
                  (contentForm.content_type === 'image' && !contentForm.explanation.trim())
                }
                className="h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
              >
                {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                Add Content
              </button>
              <button
                onClick={() => setActiveStep(2)}
                disabled={!canProceedToPublish}
                className="gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStep === 2 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Ready to publish</p>
              <p className="text-lg font-bold">{classroom?.name}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span>{lesson?.title}</span>
              <span>•</span>
              <span>{contentItems.length} content item(s)</span>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="p-4 rounded-xl bg-black/30 border border-[var(--card-border)]">
              <p className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Visibility</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={publishForm.is_public}
                    onChange={() => setPublishForm(prev => ({ ...prev, is_public: true }))}
                    className="accent-[var(--gold)]"
                  />
                  Public (discoverable)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!publishForm.is_public}
                    onChange={() => setPublishForm(prev => ({ ...prev, is_public: false }))}
                    className="accent-[var(--gold)]"
                  />
                  Private (invite only)
                </label>
              </div>
            </div>

            {!canSetPaidPricing && (
              <div className="p-4 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-sm">
                Connect Stripe to enable paid strategies.
              </div>
            )}

            <div className="p-4 rounded-xl bg-black/30 border border-[var(--card-border)] space-y-3">
              <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Pricing</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPublishForm(prev => ({ ...prev, pricing_type: 'free' }))}
                  className={`p-3 rounded-xl border-2 text-left ${
                    publishForm.pricing_type === 'free'
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                      : 'border-[var(--card-border)]'
                  }`}
                >
                  <p className="font-semibold">Free</p>
                  <p className="text-xs text-[var(--muted)]">No subscription required</p>
                </button>
                <button
                  onClick={() => canSetPaidPricing && setPublishForm(prev => ({ ...prev, pricing_type: 'paid' }))}
                  disabled={!canSetPaidPricing}
                  className={`p-3 rounded-xl border-2 text-left ${
                    publishForm.pricing_type === 'paid'
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                      : 'border-[var(--card-border)]'
                  } ${!canSetPaidPricing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p className="font-semibold">Paid</p>
                  <p className="text-xs text-[var(--muted)]">Monthly subscription</p>
                </button>
              </div>

              {publishForm.pricing_type === 'paid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                      Monthly Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={publishForm.monthly_price}
                        onChange={(e) => setPublishForm(prev => ({ ...prev, monthly_price: e.target.value }))}
                        className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                      Trial Days (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={publishForm.trial_days}
                      onChange={(e) => setPublishForm(prev => ({ ...prev, trial_days: e.target.value }))}
                      className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setActiveStep(1)}
              className="h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handlePublish}
              disabled={
                isSaving ||
                !canProceedToPublish ||
                (publishForm.pricing_type === 'paid' && !canSetPaidPricing)
              }
              className="gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
            >
              {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              Publish Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
