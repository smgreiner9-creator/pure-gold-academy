'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Input, Textarea, Select } from '@/components/ui'
import { TradeCall, TradeCallStatus } from '@/types/database'

interface TradeCallFormProps {
  initialData?: Partial<TradeCall>
  onSubmit: (data: TradeCallFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  mode?: 'create' | 'edit' | 'close'
}

export interface TradeCallFormData {
  instrument: string
  direction: 'long' | 'short'
  entry_price: number
  stop_loss: number
  take_profit_1: number | null
  take_profit_2: number | null
  take_profit_3: number | null
  timeframe: string | null
  analysis_text: string | null
  chart_url: string | null
  // For closing
  status?: TradeCallStatus
  actual_exit_price?: number | null
  result_pips?: number | null
  close_notes?: string | null
}

const TIMEFRAMES = [
  { value: '', label: 'Select timeframe' },
  { value: 'M1', label: '1 Minute' },
  { value: 'M5', label: '5 Minutes' },
  { value: 'M15', label: '15 Minutes' },
  { value: 'M30', label: '30 Minutes' },
  { value: 'H1', label: '1 Hour' },
  { value: 'H4', label: '4 Hours' },
  { value: 'D1', label: 'Daily' },
  { value: 'W1', label: 'Weekly' },
]

const COMMON_INSTRUMENTS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'XAUUSD', 'XAGUSD', 'US30', 'US100', 'SPX500', 'BTCUSD', 'ETHUSD'
]

export function TradeCallForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create'
}: TradeCallFormProps) {
  const [formData, setFormData] = useState<TradeCallFormData>({
    instrument: initialData?.instrument || '',
    direction: initialData?.direction || 'long',
    entry_price: initialData?.entry_price || 0,
    stop_loss: initialData?.stop_loss || 0,
    take_profit_1: initialData?.take_profit_1 ?? null,
    take_profit_2: initialData?.take_profit_2 ?? null,
    take_profit_3: initialData?.take_profit_3 ?? null,
    timeframe: initialData?.timeframe ?? null,
    analysis_text: initialData?.analysis_text ?? null,
    chart_url: initialData?.chart_url ?? null,
    status: initialData?.status,
    actual_exit_price: initialData?.actual_exit_price ?? null,
    close_notes: initialData?.close_notes ?? null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Calculate R:R ratio
  const calculateRR = () => {
    if (!formData.entry_price || !formData.stop_loss || !formData.take_profit_1) return null
    const risk = Math.abs(formData.entry_price - formData.stop_loss)
    const reward = Math.abs(formData.take_profit_1 - formData.entry_price)
    if (risk === 0) return null
    return reward / risk
  }

  const riskReward = calculateRR()

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.instrument.trim()) {
      newErrors.instrument = 'Instrument is required'
    }
    if (!formData.entry_price || formData.entry_price <= 0) {
      newErrors.entry_price = 'Valid entry price is required'
    }
    if (!formData.stop_loss || formData.stop_loss <= 0) {
      newErrors.stop_loss = 'Valid stop loss is required'
    }

    // Validate SL is in correct direction
    if (formData.entry_price && formData.stop_loss) {
      if (formData.direction === 'long' && formData.stop_loss >= formData.entry_price) {
        newErrors.stop_loss = 'Stop loss must be below entry for long trades'
      }
      if (formData.direction === 'short' && formData.stop_loss <= formData.entry_price) {
        newErrors.stop_loss = 'Stop loss must be above entry for short trades'
      }
    }

    // Validate TPs are in correct direction
    if (formData.take_profit_1 && formData.entry_price) {
      if (formData.direction === 'long' && formData.take_profit_1 <= formData.entry_price) {
        newErrors.take_profit_1 = 'TP1 must be above entry for long trades'
      }
      if (formData.direction === 'short' && formData.take_profit_1 >= formData.entry_price) {
        newErrors.take_profit_1 = 'TP1 must be below entry for short trades'
      }
    }

    if (mode === 'close' && !formData.status) {
      newErrors.status = 'Select how the trade closed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    await onSubmit(formData)
  }

  const updateField = <K extends keyof TradeCallFormData>(
    field: K,
    value: TradeCallFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  if (mode === 'close') {
    return (
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="font-semibold text-lg mb-4">Close Trade Call</h3>

          <div>
            <label className="block text-sm font-medium mb-1">How did the trade close?</label>
            <Select
              value={formData.status || ''}
              onChange={(e) => updateField('status', e.target.value as TradeCallStatus)}
            >
              <option value="">Select outcome</option>
              <option value="hit_tp1">Hit TP1</option>
              <option value="hit_tp2">Hit TP2</option>
              <option value="hit_tp3">Hit TP3</option>
              <option value="hit_sl">Hit Stop Loss</option>
              <option value="manual_close">Manual Close</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            {errors.status && <p className="text-xs text-[var(--danger)] mt-1">{errors.status}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Exit Price (Optional)</label>
            <Input
              type="number"
              step="any"
              value={formData.actual_exit_price || ''}
              onChange={(e) => updateField('actual_exit_price', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Result in Pips (Optional)</label>
            <Input
              type="number"
              step="any"
              value={formData.result_pips || ''}
              onChange={(e) => updateField('result_pips', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Close Notes (Optional)</label>
            <Textarea
              value={formData.close_notes || ''}
              onChange={(e) => updateField('close_notes', e.target.value || null)}
              placeholder="Add any notes about the trade outcome..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={isLoading} className="flex-1">
              Close Trade
            </Button>
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-semibold text-lg mb-4">
          {mode === 'edit' ? 'Edit Trade Call' : 'New Trade Call'}
        </h3>

        {/* Direction Toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">Direction</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateField('direction', 'long')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                formData.direction === 'long'
                  ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border-[var(--glass-surface-border)] hover:border-[var(--success)]/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">trending_up</span>
              <span className="font-semibold">Long</span>
            </button>
            <button
              type="button"
              onClick={() => updateField('direction', 'short')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                formData.direction === 'short'
                  ? 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]'
                  : 'border-[var(--glass-surface-border)] hover:border-[var(--danger)]/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">trending_down</span>
              <span className="font-semibold">Short</span>
            </button>
          </div>
        </div>

        {/* Instrument */}
        <div>
          <label className="block text-sm font-medium mb-1">Instrument</label>
          <Input
            value={formData.instrument}
            onChange={(e) => updateField('instrument', e.target.value.toUpperCase())}
            placeholder="EURUSD"
            list="instruments"
          />
          <datalist id="instruments">
            {COMMON_INSTRUMENTS.map(i => <option key={i} value={i} />)}
          </datalist>
          {errors.instrument && <p className="text-xs text-[var(--danger)] mt-1">{errors.instrument}</p>}
        </div>

        {/* Price Levels */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Entry Price</label>
            <Input
              type="number"
              step="any"
              value={formData.entry_price || ''}
              onChange={(e) => updateField('entry_price', parseFloat(e.target.value) || 0)}
              placeholder="0.00000"
            />
            {errors.entry_price && <p className="text-xs text-[var(--danger)] mt-1">{errors.entry_price}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stop Loss</label>
            <Input
              type="number"
              step="any"
              value={formData.stop_loss || ''}
              onChange={(e) => updateField('stop_loss', parseFloat(e.target.value) || 0)}
              placeholder="0.00000"
              className="border-[var(--danger)]/30"
            />
            {errors.stop_loss && <p className="text-xs text-[var(--danger)] mt-1">{errors.stop_loss}</p>}
          </div>
        </div>

        {/* Take Profit 1 */}
        <div>
          <label className="block text-sm font-medium mb-1">Take Profit 1</label>
          <Input
            type="number"
            step="any"
            value={formData.take_profit_1 || ''}
            onChange={(e) => updateField('take_profit_1', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="0.00000"
            className="border-[var(--success)]/30"
          />
          {errors.take_profit_1 && <p className="text-xs text-[var(--danger)] mt-1">{errors.take_profit_1}</p>}
        </div>

        {/* R:R Display */}
        {riskReward !== null && (
          <div className="flex items-center gap-2 p-3 glass-surface rounded-lg">
            <span className="text-sm text-[var(--muted)]">Risk:Reward</span>
            <span className={`font-mono font-bold ${riskReward >= 2 ? 'text-[var(--success)]' : riskReward >= 1 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
              1:{riskReward.toFixed(2)}
            </span>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-[var(--gold)] hover:underline"
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 border border-[var(--glass-surface-border)] rounded-lg">
            {/* Additional TPs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Take Profit 2</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.take_profit_2 || ''}
                  onChange={(e) => updateField('take_profit_2', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Take Profit 3</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.take_profit_3 || ''}
                  onChange={(e) => updateField('take_profit_3', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Timeframe */}
            <div>
              <label className="block text-sm font-medium mb-1">Timeframe</label>
              <Select
                value={formData.timeframe || ''}
                onChange={(e) => updateField('timeframe', e.target.value || null)}
              >
                {TIMEFRAMES.map(tf => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </Select>
            </div>

            {/* Chart URL */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <span className="material-symbols-outlined text-sm inline mr-1">link</span>
                TradingView Chart URL
              </label>
              <Input
                type="url"
                value={formData.chart_url || ''}
                onChange={(e) => updateField('chart_url', e.target.value || null)}
                placeholder="https://www.tradingview.com/chart/..."
              />
            </div>

            {/* Analysis */}
            <div>
              <label className="block text-sm font-medium mb-1">Analysis</label>
              <Textarea
                value={formData.analysis_text || ''}
                onChange={(e) => updateField('analysis_text', e.target.value || null)}
                placeholder="Share your analysis and reasoning..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isLoading} className="flex-1">
            {mode === 'edit' ? 'Update Trade Call' : 'Post Trade Call'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
