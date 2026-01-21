'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Input, Textarea } from '@/components/ui'
import { Save, ArrowLeft, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ScreenshotUpload } from '@/components/journal/ScreenshotUpload'
import type { TradeDirection, EmotionType, TradeOutcome } from '@/types/database'

const instruments = [
  { value: 'XAUUSD', label: 'Gold (XAUUSD)' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'Bitcoin' },
  { value: 'OTHER', label: 'Other' },
]

const emotions = [
  { value: 'calm', label: '😌 Calm' },
  { value: 'confident', label: '💪 Confident' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'fearful', label: '😨 Fearful' },
  { value: 'greedy', label: '🤑 Greedy' },
  { value: 'frustrated', label: '😤 Frustrated' },
]

const outcomes = [
  { value: 'win', label: '✅ Win' },
  { value: 'loss', label: '❌ Loss' },
  { value: 'breakeven', label: '➖ Breakeven' },
]

const tradingRules = [
  { id: 'plan', label: 'Followed my trading plan' },
  { id: 'risk', label: 'Proper risk management (1-2% max)' },
  { id: 'confirmation', label: 'Waited for confirmation' },
  { id: 'session', label: 'Traded during optimal session' },
  { id: 'news', label: 'Checked economic calendar' },
  { id: 'emotional', label: 'Was in a good emotional state' },
  { id: 'stop', label: 'Set stop loss before entry' },
  { id: 'journal', label: 'Documented trade thesis' },
]

export default function EditJournalEntryPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [instrument, setInstrument] = useState('XAUUSD')
  const [customInstrument, setCustomInstrument] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [outcome, setOutcome] = useState<string>('')
  const [emotionBefore, setEmotionBefore] = useState('neutral')
  const [emotionDuring, setEmotionDuring] = useState('')
  const [emotionAfter, setEmotionAfter] = useState('')
  const [notes, setNotes] = useState('')
  const [tradeDate, setTradeDate] = useState('')
  const [positionSize, setPositionSize] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [rulesFollowed, setRulesFollowed] = useState<string[]>([])

  const entryId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined

  // Calculate R-multiple and P&L
  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const sl = parseFloat(stopLoss)
    const size = parseFloat(positionSize)

    let rMultiple: number | null = null
    let pnl: number | null = null

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(sl) && sl !== entry) {
      const risk = Math.abs(entry - sl)
      const reward = direction === 'long' ? exit - entry : entry - exit
      rMultiple = parseFloat((reward / risk).toFixed(2))
    }

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(size)) {
      const priceDiff = direction === 'long' ? exit - entry : entry - exit
      pnl = parseFloat((priceDiff * size * 100).toFixed(2))
    }

    return { rMultiple, pnl }
  }, [entryPrice, exitPrice, stopLoss, positionSize, direction])

  const loadEntry = useCallback(async () => {
    if (!entryId) return

    try {
      const { data, error: fetchError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Entry not found')

      // Check if the instrument is in the predefined list
      const isKnownInstrument = instruments.some(i => i.value === data.instrument)
      if (isKnownInstrument) {
        setInstrument(data.instrument)
      } else {
        setInstrument('OTHER')
        setCustomInstrument(data.instrument)
      }

      setDirection(data.direction)
      setEntryPrice(String(data.entry_price))
      setExitPrice(data.exit_price ? String(data.exit_price) : '')
      setOutcome(data.outcome || '')
      setEmotionBefore(data.emotion_before)
      setEmotionDuring(data.emotion_during || '')
      setEmotionAfter(data.emotion_after || '')
      setNotes(data.notes || '')
      setTradeDate(data.trade_date)
      setPositionSize(String(data.position_size))
      setStopLoss(data.stop_loss ? String(data.stop_loss) : '')
      setTakeProfit(data.take_profit ? String(data.take_profit) : '')
      setScreenshots(data.screenshot_urls || [])
      setRulesFollowed(Array.isArray(data.rules_followed) ? (data.rules_followed as string[]) : [])
    } catch (err) {
      console.error('Error loading entry:', err)
      setError('Failed to load entry')
    } finally {
      setIsLoading(false)
    }
  }, [entryId, supabase])

  useEffect(() => {
    if (entryId) {
      loadEntry()
    }
  }, [entryId, loadEntry])

  const handleSubmit = async () => {
    if (!profile?.id || !entryId) {
      setError('Unable to update. Please try again.')
      return
    }

    const finalInstrument = instrument === 'OTHER' ? customInstrument : instrument
    if (!finalInstrument) {
      setError('Please select or enter an instrument')
      return
    }

    if (!entryPrice) {
      setError('Please enter your entry price')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      const updateData = {
        instrument: finalInstrument,
        direction: direction as TradeDirection,
        entry_price: parseFloat(entryPrice),
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        position_size: positionSize ? parseFloat(positionSize) : 0.01,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        r_multiple: calculations.rMultiple,
        pnl: calculations.pnl,
        outcome: outcome ? (outcome as TradeOutcome) : null,
        emotion_before: emotionBefore as EmotionType,
        emotion_during: emotionDuring ? (emotionDuring as EmotionType) : null,
        emotion_after: emotionAfter ? (emotionAfter as EmotionType) : null,
        notes: notes || null,
        trade_date: tradeDate,
        rules_followed: rulesFollowed,
        screenshot_urls: screenshots,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('journal_entries')
        .update(updateData)
        .eq('id', entryId)
        .eq('user_id', profile.id)

      if (updateError) throw new Error(updateError.message)

      setSuccess(true)
      setTimeout(() => {
        router.push(`/journal/${entryId}`)
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error('Update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entryId) return
    if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)

      if (deleteError) throw deleteError
      router.push('/journal')
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete entry')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="animate-pulse">
          <div className="h-8 bg-[var(--card-border)] rounded w-1/3 mb-4" />
          <div className="h-6 bg-[var(--card-border)] rounded w-1/2 mb-2" />
          <div className="h-6 bg-[var(--card-border)] rounded w-1/4" />
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
          <Save size={32} className="text-[var(--success)]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Changes Saved!</h2>
        <p className="text-[var(--muted)]">Redirecting...</p>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Trade</h1>
            <p className="text-[var(--muted)]">Update your journal entry</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-[var(--danger)] hover:bg-[var(--danger)]/10"
        >
          <Trash2 size={18} />
        </Button>
      </div>

      {/* Trade Setup */}
      <Card>
        <h3 className="font-semibold text-lg mb-6">Trade Details</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Instrument</label>
            <div className="grid grid-cols-3 gap-2">
              {instruments.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setInstrument(i.value)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    instrument === i.value
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
            {instrument === 'OTHER' && (
              <Input
                id="customInstrument"
                value={customInstrument}
                onChange={(e) => setCustomInstrument(e.target.value.toUpperCase())}
                placeholder="Enter symbol (e.g., AAPL)"
                className="mt-2"
              />
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Direction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`p-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  direction === 'long'
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                }`}
              >
                <TrendingUp size={20} />
                <span className="font-medium">Long (Buy)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`p-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  direction === 'short'
                    ? 'bg-[var(--danger)] text-white'
                    : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                }`}
              >
                <TrendingDown size={20} />
                <span className="font-medium">Short (Sell)</span>
              </button>
            </div>
          </div>

          <Input
            id="tradeDate"
            label="Trade Date"
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Prices & Outcome */}
      <Card>
        <h3 className="font-semibold text-lg mb-6">Prices & Outcome</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="entryPrice"
              label="Entry Price"
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="e.g., 2650.50"
              required
            />
            <Input
              id="exitPrice"
              label="Exit Price"
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="Leave blank if open"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              id="positionSize"
              label="Position Size"
              type="number"
              step="any"
              value={positionSize}
              onChange={(e) => setPositionSize(e.target.value)}
              placeholder="0.01"
            />
            <Input
              id="stopLoss"
              label="Stop Loss"
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
            />
            <Input
              id="takeProfit"
              label="Take Profit"
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Outcome</label>
            <div className="grid grid-cols-3 gap-2">
              {outcomes.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(outcome === o.value ? '' : o.value)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    outcome === o.value
                      ? o.value === 'win'
                        ? 'bg-[var(--success)] text-white'
                        : o.value === 'loss'
                        ? 'bg-[var(--danger)] text-white'
                        : 'bg-[var(--gold)] text-black'
                      : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Emotions & Notes */}
      <Card>
        <h3 className="font-semibold text-lg mb-6">Emotions & Notes</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Before the trade</label>
            <div className="grid grid-cols-4 gap-2">
              {emotions.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEmotionBefore(e.value)}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    emotionBefore === e.value
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">During the trade</label>
            <div className="grid grid-cols-4 gap-2">
              {emotions.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEmotionDuring(emotionDuring === e.value ? '' : e.value)}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    emotionDuring === e.value
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">After the trade</label>
            <div className="grid grid-cols-4 gap-2">
              {emotions.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEmotionAfter(emotionAfter === e.value ? '' : e.value)}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    emotionAfter === e.value
                      ? 'bg-[var(--gold)] text-black'
                      : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Rules Followed</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tradingRules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => {
                    setRulesFollowed(prev =>
                      prev.includes(rule.id)
                        ? prev.filter(r => r !== rule.id)
                        : [...prev, rule.id]
                    )
                  }}
                  className={`p-2 rounded-lg text-left text-xs transition-all flex items-center gap-2 ${
                    rulesFollowed.includes(rule.id)
                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : 'bg-[var(--background)] hover:bg-[var(--card-border)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {rulesFollowed.includes(rule.id) ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  {rule.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            id="notes"
            label="Notes & Reflection"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you learn? What would you do differently?"
            className="min-h-[100px]"
          />

          {profile?.id && (
            <ScreenshotUpload
              userId={profile.id}
              screenshots={screenshots}
              onScreenshotsChange={setScreenshots}
              maxFiles={4}
            />
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => router.back()} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSaving} className="flex-1">
            <Save size={18} />
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  )
}
