'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft'
import { calculatePnl } from '@/lib/pnlCalculator'
import { useActiveClassroomStore } from '@/store/activeClassroom'
import type { ChartState } from '@/lib/chartUtils'
import type { TradeDirection, EmotionType, TradeOutcome, Json, OnboardingState, JournalEntry, SetupType } from '@/types/database'
import { TradeStep } from './steps/TradeStep'
import { ReflectionStep } from './steps/ReflectionStep'
import { DeepDiveStep } from './steps/DeepDiveStep'
import type { FormState } from './steps/TradeStep'
import { PostTradeReflection } from './PostTradeReflection'
import { PreTradeNudges } from './PreTradeNudges'
import { useProgressiveLevel } from '@/hooks/useProgressiveLevel'

const defaultTradingRules = [
  { id: 'plan', label: 'Followed my trading plan' },
  { id: 'risk', label: 'Proper risk management (1-2% max)' },
  { id: 'confirmation', label: 'Waited for confirmation' },
  { id: 'session', label: 'Traded during optimal session' },
  { id: 'news', label: 'Checked economic calendar' },
  { id: 'emotional', label: 'Was in a good emotional state' },
  { id: 'stop', label: 'Set stop loss before entry' },
  { id: 'journal', label: 'Documented trade thesis' },
]

const defaultFormState: FormState = {
  instrument: 'XAUUSD',
  customInstrument: '',
  direction: 'long',
  tradeDate: new Date().toISOString().split('T')[0],
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  takeProfit: '',
  positionSize: '0.01',
  outcome: '',
  emotionBefore: '',
  emotionDuring: '',
  emotionAfter: '',
  notes: '',
  rulesFollowed: [],
  readiness: null,
  mindsetTags: [],
  setupType: '',
  setupTypeCustom: '',
  executionRating: null,
  reflectionNotes: '',
}

interface SteppedEntryFormProps {
  entryId?: string
}

export function SteppedEntryForm({ entryId }: SteppedEntryFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const { activeClassroomId } = useActiveClassroomStore()
  const supabase = useMemo(() => createClient(), [])

  const isEditMode = !!entryId
  const tradeCallId = searchParams.get('trade_call_id') || null
  const { isUnlocked } = useProgressiveLevel()
  const [isLoadingEntry, setIsLoadingEntry] = useState(!!entryId)

  // Build rules list: defaults + user's custom rules from onboarding
  const tradingRules = useMemo(() => {
    const rules = [...defaultTradingRules]
    const onboarding = profile?.onboarding_state as OnboardingState | null
    const userRules = onboarding?.trading_rules ?? []
    const defaultLabels = new Set(defaultTradingRules.map(r => r.label))
    for (const rule of userRules) {
      if (!defaultLabels.has(rule)) {
        rules.push({ id: `custom_${rule}`, label: rule })
      }
    }
    return rules
  }, [profile?.onboarding_state])

  const [form, setForm] = useState<FormState>(() => {
    return {
      ...defaultFormState,
      instrument: searchParams.get('instrument') || defaultFormState.instrument,
      direction: (searchParams.get('direction') as 'long' | 'short') || defaultFormState.direction,
      entryPrice: searchParams.get('entry_price') || '',
      stopLoss: searchParams.get('sl') || '',
      takeProfit: searchParams.get('tp') || '',
      tradeDate: searchParams.get('date') || defaultFormState.tradeDate,
    }
  })

  const [screenshots, setScreenshots] = useState<string[]>([])
  const [chartData, setChartData] = useState<ChartState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [nudgeEntries, setNudgeEntries] = useState<JournalEntry[]>([])
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null)

  // Auto-save draft
  const { hasDraft, restoredDraft, clearDraft, dismissDraft } = useAutoSaveDraft(profile?.id, form)

  // Load entries for nudges (Level 5+)
  useEffect(() => {
    if (!profile?.id || !isUnlocked(5)) return
    const loadNudgeEntries = async () => {
      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })
        .limit(50)
      if (data) setNudgeEntries(data)
    }
    loadNudgeEntries()
  }, [profile?.id, isUnlocked, supabase])

  // Load existing entry for edit mode
  useEffect(() => {
    if (!entryId || !profile?.id) return
    const loadEntry = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('id', entryId)
          .single()
        if (fetchError || !data) throw fetchError || new Error('Entry not found')

        const instruments = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'OTHER']
        const isKnownInstrument = instruments.includes(data.instrument)

        setForm({
          instrument: isKnownInstrument ? data.instrument : 'OTHER',
          customInstrument: isKnownInstrument ? '' : data.instrument,
          direction: data.direction,
          tradeDate: data.trade_date,
          entryPrice: String(data.entry_price),
          exitPrice: data.exit_price ? String(data.exit_price) : '',
          stopLoss: data.stop_loss ? String(data.stop_loss) : '',
          takeProfit: data.take_profit ? String(data.take_profit) : '',
          positionSize: String(data.position_size),
          outcome: data.outcome || '',
          emotionBefore: data.emotion_before || '',
          emotionDuring: data.emotion_during || '',
          emotionAfter: data.emotion_after || '',
          notes: data.notes || '',
          rulesFollowed: Array.isArray(data.rules_followed) ? (data.rules_followed as string[]) : [],
          readiness: (data.pre_trade_mindset as { readiness?: number | null })?.readiness ?? null,
          mindsetTags: (data.pre_trade_mindset as { tags?: string[] })?.tags ?? [],
          setupType: data.setup_type || '',
          setupTypeCustom: data.setup_type_custom || '',
          executionRating: data.execution_rating ?? null,
          reflectionNotes: data.reflection_notes || '',
        })
        if (data.screenshot_urls) setScreenshots(data.screenshot_urls)
        if (data.chart_data) setChartData(data.chart_data as unknown as ChartState)
      } catch (err) {
        console.error('Error loading entry:', err)
        setError('Failed to load entry')
      } finally {
        setIsLoadingEntry(false)
      }
    }
    loadEntry()
  }, [entryId, profile?.id, supabase])

  // Restore draft prompt
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  useEffect(() => {
    if (hasDraft && restoredDraft) {
      setShowDraftPrompt(true)
    }
  }, [hasDraft, restoredDraft])

  const restoreDraft = useCallback(() => {
    if (restoredDraft) {
      setForm(restoredDraft as FormState)
      setShowDraftPrompt(false)
    }
  }, [restoredDraft])

  // Field updater
  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  // Calculations
  const calculations = useMemo(() => {
    const entry = parseFloat(form.entryPrice)
    const exit = parseFloat(form.exitPrice)
    const sl = parseFloat(form.stopLoss)
    const size = parseFloat(form.positionSize)

    if (isNaN(entry) || isNaN(exit) || isNaN(size)) {
      return { rMultiple: null, pnl: null }
    }

    const finalInstrument = form.instrument === 'OTHER' ? (form.customInstrument || 'OTHER') : form.instrument
    const result = calculatePnl({
      instrument: finalInstrument,
      direction: form.direction,
      entryPrice: entry,
      exitPrice: exit,
      positionSize: size,
      stopLoss: !isNaN(sl) ? sl : null,
    })

    return { rMultiple: result.rMultiple, pnl: result.pnl }
  }, [form.entryPrice, form.exitPrice, form.stopLoss, form.positionSize, form.direction, form.instrument, form.customInstrument])

  // Step 2 visibility: instrument + direction + entryPrice are filled
  const showReflection = !!(form.instrument && form.direction && form.entryPrice)

  const handleSubmit = async () => {
    if (!profile?.id) {
      setError('Please wait for your profile to load.')
      return
    }

    const finalInstrument = form.instrument === 'OTHER' ? form.customInstrument : form.instrument
    if (!finalInstrument) { setError('Please select or enter an instrument'); return }
    if (!form.entryPrice) { setError('Please enter your entry price'); return }
    if (!form.emotionBefore) { setError('Please select how you felt before the trade'); return }

    setError('')
    setIsLoading(true)

    try {
      const entryData = {
        user_id: profile.id,
        classroom_id: activeClassroomId || profile.classroom_id || null,
        instrument: finalInstrument,
        direction: form.direction as TradeDirection,
        entry_price: parseFloat(form.entryPrice),
        exit_price: form.exitPrice ? parseFloat(form.exitPrice) : null,
        stop_loss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        take_profit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        position_size: parseFloat(form.positionSize),
        r_multiple: calculations.rMultiple,
        pnl: calculations.pnl,
        outcome: form.outcome ? (form.outcome as TradeOutcome) : null,
        emotion_before: form.emotionBefore as EmotionType,
        emotion_during: form.emotionDuring ? (form.emotionDuring as EmotionType) : null,
        emotion_after: form.emotionAfter ? (form.emotionAfter as EmotionType) : null,
        notes: form.notes || null,
        trade_date: form.tradeDate,
        rules_followed: form.rulesFollowed,
        screenshot_urls: screenshots,
        chart_data: chartData ? (chartData as unknown as Json) : null,
        pre_trade_mindset: (form.readiness !== null || form.mindsetTags.length > 0) ? {
          readiness: form.readiness,
          tags: form.mindsetTags,
          captured_at: new Date().toISOString()
        } as unknown as Json : null,
        trade_call_id: tradeCallId,
        setup_type: (form.setupType || null) as SetupType | null,
        setup_type_custom: form.setupTypeCustom || null,
        execution_rating: form.executionRating,
        reflection_notes: form.reflectionNotes || null,
      }

      if (isEditMode && entryId) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({ ...entryData, updated_at: new Date().toISOString() })
          .eq('id', entryId)
          .eq('user_id', profile.id)

        if (updateError) {
          console.error('Journal update error:', updateError)
          throw new Error(updateError.message)
        }

        setSuccess(true)
        setTimeout(() => { router.push(`/journal/${entryId}`); router.refresh() }, 1200)
      } else {
        // Insert new entry
        const { data: insertedEntry, error: insertError } = await supabase
          .from('journal_entries')
          .insert(entryData)
          .select('id')
          .single()

        if (insertError) {
          console.error('Journal save error:', insertError)
          throw new Error(insertError.message)
        }

        clearDraft()

        // Increment trades_logged in onboarding_state
        try {
          const onboarding = (profile.onboarding_state as unknown as OnboardingState) ?? { trades_logged: 0 }
          await supabase
            .from('profiles')
            .update({
              onboarding_state: {
                ...onboarding,
                trades_logged: (onboarding.trades_logged ?? 0) + 1,
                first_trade_at: onboarding.first_trade_at ?? new Date().toISOString(),
              },
            })
            .eq('user_id', profile.user_id)
        } catch (e) {
          console.error('Failed to update trades_logged:', e)
        }

        if (insertedEntry && calculations.rMultiple !== null) {
          setSavedEntryId(insertedEntry.id)
          setSuccess(true)
        } else {
          setSuccess(true)
          setTimeout(() => { router.push('/journal'); router.refresh() }, 1200)
        }
      }
    } catch (err) {
      console.error('Journal save failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading entry for edit mode
  if (isLoadingEntry) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/5 rounded w-1/3" />
          <div className="h-4 bg-black/5 rounded w-1/2" />
          <div className="h-64 bg-black/5 rounded" />
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    if (isEditMode) {
      return (
        <div className="p-12 rounded-2xl glass-surface text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--success)]">save</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Changes Saved!</h2>
          <p className="text-[var(--muted)]">Redirecting...</p>
        </div>
      )
    }

    if (savedEntryId) {
      // Compute average R from nudge entries for comparison
      const entriesWithR = nudgeEntries.filter(e => e.r_multiple !== null)
      const avgR = entriesWithR.length > 0
        ? entriesWithR.reduce((sum, e) => sum + (e.r_multiple ?? 0), 0) / entriesWithR.length
        : null

      return (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="p-8 rounded-2xl glass-surface text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Trade Logged!</h2>
            <p className="text-[var(--muted)] text-sm">Take a moment to reflect on this trade</p>
          </div>
          <PostTradeReflection
            entryId={savedEntryId}
            instrument={form.instrument === 'OTHER' ? (form.customInstrument || 'Custom') : form.instrument}
            rMultiple={calculations.rMultiple}
            avgR={avgR}
            onContinue={() => { router.push('/journal'); router.refresh() }}
          />
        </div>
      )
    }

    return (
      <div className="p-12 rounded-2xl glass-surface text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Trade Logged!</h2>
        <p className="text-[var(--muted)]">Redirecting to your journal...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-lg btn-glass flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Trade' : 'Log Trade'}</h1>
            <p className="text-[var(--muted)] text-sm">
              {isEditMode ? 'Update your journal entry' : 'Fill in the trade, reflect, then go deeper if you want'}
            </p>
            {tradeCallId && (
              <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gold)]/10 text-[var(--gold)]">
                <span className="material-symbols-outlined text-xs">link</span>
                Based on trade call
              </span>
            )}
          </div>
        </div>
        {isEditMode && (
          <button
            onClick={async () => {
              if (!entryId || !confirm('Are you sure you want to delete this entry? This cannot be undone.')) return
              try {
                await supabase.from('journal_entries').delete().eq('id', entryId)
                router.push('/journal')
                router.refresh()
              } catch (err) {
                console.error('Delete error:', err)
                setError('Failed to delete entry')
              }
            }}
            className="w-10 h-10 rounded-lg btn-glass flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
      </div>

      {/* Draft Restore Prompt */}
      {!isEditMode && showDraftPrompt && (
        <div className="p-4 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--gold)]">history</span>
            <p className="text-sm">You have an unsaved draft. Resume where you left off?</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { dismissDraft(); setShowDraftPrompt(false) }}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-3 py-1.5 rounded-lg btn-glass transition-colors"
            >
              Discard
            </button>
            <button
              onClick={restoreDraft}
              className="text-xs text-black font-bold px-3 py-1.5 rounded-lg gold-gradient hover:opacity-90 transition-all"
            >
              Restore
            </button>
          </div>
        </div>
      )}

      {/* Pre-trade nudges — Level 5+ */}
      {isUnlocked(5) && nudgeEntries.length > 0 && (
        <PreTradeNudges
          entries={nudgeEntries}
          instrument={form.instrument === 'OTHER' ? form.customInstrument : form.instrument}
          emotion={form.emotionBefore as EmotionType | undefined}
        />
      )}

      {/* Step 1: The Trade — always visible */}
      <TradeStep
        form={form}
        updateField={updateField}
        calculations={calculations}
      />

      {/* Step 2: The Reflection — appears when instrument + direction + entryPrice are filled */}
      {showReflection && (
        <ReflectionStep
          form={form}
          updateField={updateField}
          tradingRules={tradingRules}
        />
      )}

      {/* Post-trade reflection placeholder */}
      {/* TODO (E4): Insert PostTradeReflection component here, after ReflectionStep */}

      {/* Step 3: Go Deeper — expandable */}
      {showReflection && profile?.id && (
        <DeepDiveStep
          form={form}
          updateField={updateField}
          screenshots={screenshots}
          onScreenshotsChange={setScreenshots}
          chartData={chartData}
          onChartDataChange={setChartData}
          userId={profile.id}
        />
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {/* Fixed Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-20 lg:left-64 z-40 border-t border-[var(--glass-surface-border)] bg-[var(--background)]/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl btn-glass font-semibold hover:bg-black/5 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-[2] gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm tracking-wide uppercase flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                {isEditMode ? 'Save Changes' : 'Save Trade'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
