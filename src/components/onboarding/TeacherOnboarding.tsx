'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'

export function TeacherOnboarding() {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(0)
  const [topicName, setTopicName] = useState('')
  const [topicTagline, setTopicTagline] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const createTopic = useCallback(async () => {
    if (!profile?.id || !topicName.trim()) {
      setError('Please enter a topic name')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data, error: insertError } = await supabase
        .from('classrooms')
        .insert({
          teacher_id: profile.id,
          name: topicName.trim(),
          tagline: topicTagline.trim() || null,
          is_public: true,
        })
        .select('invite_code')
        .single()

      if (insertError) throw new Error(insertError.message)

      setInviteCode(data.invite_code)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topic')
    } finally {
      setIsSubmitting(false)
    }
  }, [profile?.id, topicName, topicTagline, supabase])

  const completeOnboarding = useCallback(async () => {
    if (!profile?.id) return
    setIsSubmitting(true)

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_state: {
            trades_logged: 0,
            first_trade_at: null,
            insights_unlocked: false,
            community_unlocked: false,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', profile.id)

      router.push('/teacher')
      router.refresh()
    } catch {
      router.push('/teacher')
    } finally {
      setIsSubmitting(false)
    }
  }, [profile?.id, supabase, router])

  const [copied, setCopied] = useState(false)
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    // Step 0: Create first topic
    <motion.div
      key="step-0"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 gold-gradient rounded-2xl flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-black">school</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Create Your First Topic</h2>
        <p className="text-[var(--muted)] text-sm">
          A topic is your classroom. Students join your topic to access lessons and trade calls.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
            Topic Name *
          </label>
          <input
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g., Gold Scalping Mastery"
            className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
            Tagline (optional)
          </label>
          <input
            value={topicTagline}
            onChange={(e) => setTopicTagline(e.target.value)}
            placeholder="e.g., Learn to scalp XAUUSD with precision"
            className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}

      <button
        onClick={createTopic}
        disabled={isSubmitting || !topicName.trim()}
        className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm uppercase tracking-wide disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Topic'}
      </button>

      <button
        onClick={() => setStep(2)}
        className="w-full text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition-colors py-2"
      >
        Skip for now
      </button>
    </motion.div>,

    // Step 1: Add first lesson (skipped — we jump to step 2 after topic creation)
    null,

    // Step 2: Share invite code
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--gold)]">
            {inviteCode ? 'link' : 'rocket_launch'}
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {inviteCode ? 'Share Your Invite Code' : 'You\'re All Set!'}
        </h2>
        <p className="text-[var(--muted)] text-sm">
          {inviteCode
            ? 'Students use this code to join your topic. Share it on social media or send it directly.'
            : 'You can create topics, lessons, and trade calls from the teaching dashboard.'}
        </p>
      </div>

      {inviteCode && (
        <div className="p-4 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 text-center">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Invite Code</p>
          <p className="text-2xl font-mono font-bold tracking-widest text-[var(--gold)]">{inviteCode}</p>
          <button
            onClick={copyInviteCode}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--gold)] hover:underline"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
          <span className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">1</span>
          <p className="text-sm"><strong>Add lessons</strong> — video, chart, or text content</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
          <span className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">2</span>
          <p className="text-sm"><strong>Post trade calls</strong> — students get notified</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
          <span className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">3</span>
          <p className="text-sm"><strong>Review journals</strong> — give feedback on student trades</p>
        </div>
      </div>

      <button
        onClick={completeOnboarding}
        disabled={isSubmitting}
        className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm uppercase tracking-wide disabled:opacity-50"
      >
        {isSubmitting ? 'Setting up...' : 'Go to Teaching Dashboard'}
      </button>
    </motion.div>,
  ]

  return (
    <div className="max-w-md mx-auto">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[0, 2].map((i, idx) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              step === i ? 'w-8 bg-[var(--gold)]' : idx === 0 && step > 0 ? 'w-4 bg-[var(--gold)]/50' : 'w-4 bg-black/[0.06]'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {steps[step]}
      </AnimatePresence>
    </div>
  )
}
