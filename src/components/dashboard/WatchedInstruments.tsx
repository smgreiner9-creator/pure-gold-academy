'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/Skeleton'

interface Instrument {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

// Mock price data - in production, this would come from a market data API
const mockPrices: Record<string, Instrument> = {
  XAUUSD: { symbol: 'XAUUSD', name: 'Gold Spot', price: 2650.45, change: 12.30, changePercent: 0.47 },
  EURUSD: { symbol: 'EURUSD', name: 'Euro / Dollar', price: 1.0924, change: -0.0023, changePercent: -0.21 },
  BTCUSD: { symbol: 'BTCUSD', name: 'Bitcoin', price: 97500.00, change: 2150.00, changePercent: 2.26 },
  GBPUSD: { symbol: 'GBPUSD', name: 'GBP / Dollar', price: 1.2543, change: 0.0012, changePercent: 0.10 },
  USDJPY: { symbol: 'USDJPY', name: 'USD / Yen', price: 149.85, change: -0.45, changePercent: -0.30 },
}

const availableInstruments = [
  { value: 'XAUUSD', label: 'Gold (XAUUSD)' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'Bitcoin' },
]

export function WatchedInstruments() {
  const { profile } = useAuth()
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(['XAUUSD', 'EURUSD', 'BTCUSD'])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadWatchedInstruments = async () => {
      if (!profile?.id) return

      try {
        const { data } = await supabase
          .from('watched_instruments')
          .select('symbol')
          .eq('user_id', profile.id)

        if (data && data.length > 0) {
          setWatchedSymbols(data.map(d => d.symbol))
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (profile?.id) {
      loadWatchedInstruments()
    } else {
      setIsLoading(false)
    }
  }, [profile?.id])

  const addInstrument = async (symbol: string) => {
    if (!profile?.id || watchedSymbols.includes(symbol)) return

    const instrument = availableInstruments.find(i => i.value === symbol)
    if (!instrument) return

    await supabase.from('watched_instruments').insert({
      user_id: profile.id,
      symbol,
      name: instrument.label,
    })

    setWatchedSymbols([...watchedSymbols, symbol])
    setShowAddModal(false)
  }

  const removeInstrument = async (symbol: string) => {
    if (!profile?.id) return

    await supabase
      .from('watched_instruments')
      .delete()
      .eq('user_id', profile.id)
      .eq('symbol', symbol)

    setWatchedSymbols(watchedSymbols.filter(s => s !== symbol))
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
              <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
          Watched Instruments
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-[var(--gold)] hover:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
        </button>
      </div>

      {/* Instruments List */}
      <div className="space-y-3">
        {watchedSymbols.map((symbol) => {
          const data = mockPrices[symbol]
          if (!data) return null

          const isPositive = data.change >= 0

          return (
            <div
              key={symbol}
              className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] flex items-center gap-4 group cursor-pointer hover:border-[var(--gold)]/50 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isPositive ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
              }`}>
                <span className="material-symbols-outlined">
                  {isPositive ? 'trending_up' : 'trending_down'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-sm font-bold">{data.symbol}</span>
                  <span className="mono-num text-sm font-bold">
                    {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--muted)] uppercase tracking-tight">{data.name}</span>
                  <span className={`mono-num text-[10px] font-bold ${
                    isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Instrument Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Instrument</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--muted)] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              {availableInstruments
                .filter(i => !watchedSymbols.includes(i.value))
                .map((instrument) => (
                  <button
                    key={instrument.value}
                    onClick={() => addInstrument(instrument.value)}
                    className="w-full p-3 text-left rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-[var(--card-border)]"
                  >
                    {instrument.label}
                  </button>
                ))}
              {availableInstruments.filter(i => !watchedSymbols.includes(i.value)).length === 0 && (
                <p className="text-[var(--muted)] text-sm text-center py-4">
                  All instruments added
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
