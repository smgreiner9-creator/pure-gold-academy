'use client'

import { useState, useCallback, useMemo } from 'react'
import type { EmotionType, TradeOutcome, SetupType } from '@/types/database'

export interface TradeFilters {
  outcome: string
  emotion: string
  setupType: string
  instrument: string
  dateRange: string
  dateFrom: string
  dateTo: string
  rMultipleMin: string
  rMultipleMax: string
  rulesFilter: string
  notesSearch: string
  customTags: string[]
}

const DEFAULT_FILTERS: TradeFilters = {
  outcome: '',
  emotion: '',
  setupType: '',
  instrument: '',
  dateRange: '30',
  dateFrom: '',
  dateTo: '',
  rMultipleMin: '',
  rMultipleMax: '',
  rulesFilter: '',
  notesSearch: '',
  customTags: [],
}

function getDateFromPreset(preset: string): string | null {
  if (preset === 'all' || preset === 'custom') return null
  const days = parseInt(preset, 10)
  if (isNaN(days)) return null
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

export function useTradeFilters() {
  const [filters, setFilters] = useState<TradeFilters>({ ...DEFAULT_FILTERS })

  const setFilter = useCallback((key: keyof TradeFilters, value: TradeFilters[keyof TradeFilters]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.outcome !== '') count++
    if (filters.emotion !== '') count++
    if (filters.setupType !== '') count++
    if (filters.instrument !== '') count++
    if (filters.dateRange !== '30') count++
    if (filters.dateRange === 'custom' && (filters.dateFrom || filters.dateTo)) count++
    if (filters.rMultipleMin !== '') count++
    if (filters.rMultipleMax !== '') count++
    if (filters.rulesFilter !== '') count++
    if (filters.notesSearch !== '') count++
    if (filters.customTags.length > 0) count++
    return count
  }, [filters])

  const buildQuery = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (baseQuery: any): any => {
      let query = baseQuery

      // Outcome filter
      if (filters.outcome) {
        query = query.eq('outcome', filters.outcome as TradeOutcome)
      }

      // Emotion filter (matches emotion_before)
      if (filters.emotion) {
        query = query.eq('emotion_before', filters.emotion as EmotionType)
      }

      // Setup type filter
      if (filters.setupType) {
        query = query.eq('setup_type', filters.setupType as SetupType)
      }

      // Instrument filter (partial match, case-insensitive)
      if (filters.instrument) {
        query = query.ilike('instrument', `%${filters.instrument}%`)
      }

      // Date range filter
      if (filters.dateRange === 'custom') {
        if (filters.dateFrom) {
          query = query.gte('trade_date', filters.dateFrom)
        }
        if (filters.dateTo) {
          query = query.lte('trade_date', filters.dateTo)
        }
      } else {
        const startDate = getDateFromPreset(filters.dateRange)
        if (startDate) {
          query = query.gte('trade_date', startDate)
        }
      }

      // R-Multiple range
      if (filters.rMultipleMin !== '') {
        const min = parseFloat(filters.rMultipleMin)
        if (!isNaN(min)) {
          query = query.gte('r_multiple', min)
        }
      }
      if (filters.rMultipleMax !== '') {
        const max = parseFloat(filters.rMultipleMax)
        if (!isNaN(max)) {
          query = query.lte('r_multiple', max)
        }
      }

      // Rules filter: followed = 4+ rules, broken = <4 rules
      // This uses a stored rules_followed array length check
      if (filters.rulesFilter === 'followed') {
        query = query.gte('rules_followed_count', 4)
      } else if (filters.rulesFilter === 'broken') {
        query = query.lt('rules_followed_count', 4)
      }

      // Notes search (case-insensitive partial match)
      if (filters.notesSearch) {
        query = query.ilike('notes', `%${filters.notesSearch}%`)
      }

      // Custom tags filter (contains all specified tags)
      if (filters.customTags.length > 0) {
        query = query.contains('custom_tags', filters.customTags)
      }

      return query
    },
    [filters]
  )

  return {
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    buildQuery,
  }
}
