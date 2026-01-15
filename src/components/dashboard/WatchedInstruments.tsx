'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/Skeleton'

interface PriceData {
  symbol: string
  price: number
  change: number
  changePercent: number
  lastUpdated: string
}

// Instrument metadata
const instrumentInfo: Record<string, { name: string; decimals: number }> = {
  XAUUSD: { name: 'Gold Spot', decimals: 2 },
  EURUSD: { name: 'Euro / Dollar', decimals: 5 },
  BTCUSD: { name: 'Bitcoin', decimals: 0 },
  GBPUSD: { name: 'GBP / Dollar', decimals: 5 },
  USDJPY: { name: 'USD / Yen', decimals: 3 },
}

const availableInstruments = [
  { value: 'XAUUSD', label: 'Gold (XAUUSD)' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'Bitcoin' },
]

export function WatchedInstruments() {
  const { profile, isLoading: authLoading } = useAuth()
  const [watchedSymbols, setWatchedSymbols] = useState<string[]>(['XAUUSD', 'EURUSD', 'BTCUSD'])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [pricesLoading, setPricesLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  // Fetch live prices
  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices')
      if (res.ok) {
        const data = await res.json()
        if (data.prices) {
          setPrices(data.prices)
        }
      }
    } catch (error) {
      console.error('Error fetching prices:', error)
    } finally {
      setPricesLoading(false)
    }
  }, [])

  // Fetch prices on mount and every 30 seconds
  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [fetchPrices])

  useEffect(() => {
    const loadWatchedInstruments = async () => {
      if (!profile?.id) return

      setIsFetching(true)
      try {
        const { data } = await supabase
          .from('watched_instruments')
          .select('symbol')
          .eq('user_id', profile.id)

        if (data && data.length > 0) {
          setWatchedSymbols(data.map(d => d.symbol))
        }
      } finally {
        setIsFetching(false)
      }
    }

    // Only fetch when auth is done loading and we have a profile
    if (!authLoading && profile?.id) {
      loadWatchedInstruments()
    }
  }, [profile?.id, authLoading, supabase])

  // Show loading only while auth is initializing
  const isLoading = authLoading || isFetching || pricesLoading

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
          const priceData = prices[symbol]
          const info = instrumentInfo[symbol]
          if (!info) return null

          const price = priceData?.price ?? 0
          const changePercent = priceData?.changePercent ?? 0
          const isPositive = changePercent >= 0
          const decimals = info.decimals

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
                  <span className="text-sm font-bold">{symbol}</span>
                  <span className="mono-num text-sm font-bold">
                    {price > 0
                      ? price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                      : '—'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[var(--muted)] uppercase tracking-tight">{info.name}</span>
                  <span className={`mono-num text-[10px] font-bold ${
                    isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                  }`}>
                    {changePercent !== 0 ? `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%` : '—'}
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
