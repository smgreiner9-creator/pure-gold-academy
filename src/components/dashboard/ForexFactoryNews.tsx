'use client'

import { useState, useEffect } from 'react'
import { SkeletonNewsItem } from '@/components/ui/Skeleton'

interface FFEvent {
  title: string
  country: string
  date: string
  time: string
  impact: string
  forecast: string
  previous: string
}

export function ForexFactoryNews() {
  const [events, setEvents] = useState<FFEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/forex-factory')
      const data = await response.json()

      if (data.events) {
        setEvents(data.events)
        setLastUpdated(data.lastUpdated)
      }

      if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      console.error('Error fetching FF news:', err)
      setError('Failed to load calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'high':
        return 'bg-[var(--danger)]'
      case 'medium':
        return 'bg-[var(--warning)]'
      case 'low':
        return 'bg-[var(--muted)]'
      case 'holiday':
        return 'bg-blue-500'
      default:
        return 'bg-[var(--card-border)]'
    }
  }

  const getCurrencyColor = (country: string) => {
    switch (country?.toUpperCase()) {
      case 'USD':
        return 'text-green-400'
      case 'EUR':
        return 'text-blue-400'
      case 'GBP':
        return 'text-purple-400'
      case 'JPY':
        return 'text-red-400'
      case 'CAD':
        return 'text-orange-400'
      case 'AUD':
        return 'text-yellow-400'
      case 'NZD':
        return 'text-cyan-400'
      case 'CHF':
        return 'text-pink-400'
      case 'CNY':
        return 'text-rose-400'
      default:
        return 'text-[var(--muted)]'
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    // Format: MM-DD-YYYY
    const [month, day, year] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr: string, dateStr: string) => {
    if (!timeStr || timeStr === 'All Day' || timeStr === 'Tentative') return timeStr || ''

    try {
      // Parse date (MM-DD-YYYY)
      const [month, day, year] = dateStr.split('-').map(Number)

      // Parse time (e.g., "1:30pm", "8:00am")
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)/i)
      if (!timeMatch) return timeStr.toUpperCase()

      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const isPM = timeMatch[3].toLowerCase() === 'pm'

      // Convert to 24-hour format
      if (isPM && hours !== 12) hours += 12
      if (!isPM && hours === 12) hours = 0

      // Create UTC date (feed times are in UTC)
      const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))

      // Convert to local time
      return utcDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      })
    } catch {
      return timeStr.toUpperCase()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonNewsItem key={i} />
        ))}
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
        <span className="material-symbols-outlined text-3xl text-[var(--danger)] mb-2 block">error</span>
        <p className="text-sm text-[var(--muted)]">{error}</p>
        <button
          onClick={fetchNews}
          className="mt-3 text-xs text-[var(--gold)] hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // Group events by date
  const groupedEvents: Record<string, FFEvent[]> = {}
  events.forEach(event => {
    const dateKey = event.date || 'Unknown'
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = []
    }
    groupedEvents[dateKey].push(event)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
          Economic Calendar
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchNews}
            className="text-[var(--gold)] hover:opacity-80 transition-opacity"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <a
            href="https://www.forexfactory.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[var(--gold)] hover:underline uppercase tracking-wider"
          >
            ForexFactory
          </a>
        </div>
      </div>

      {/* Events List - Grouped by Date */}
      <div className="space-y-4">
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <div key={dateKey}>
            {/* Date Header */}
            <div className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">
              {formatDate(dateKey)}
            </div>

            {/* Events for this date */}
            <div className="space-y-2">
              {dateEvents.map((event, idx) => (
                <div
                  key={`${dateKey}-${idx}`}
                  className="p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Impact Indicator */}
                    <div className={`w-1.5 min-h-[40px] rounded-full shrink-0 ${getImpactColor(event.impact)}`} />

                    <div className="flex-1 min-w-0">
                      {/* Time & Currency */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono-num text-xs text-[var(--muted)]">
                          {formatTime(event.time, event.date) || '--:--'}
                        </span>
                        <span className={`text-xs font-bold ${getCurrencyColor(event.country)}`}>
                          {event.country}
                        </span>
                        {event.impact && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                            event.impact === 'High' ? 'bg-[var(--danger)]/20 text-[var(--danger)]' :
                            event.impact === 'Medium' ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                            'bg-white/5 text-[var(--muted)]'
                          }`}>
                            {event.impact}
                          </span>
                        )}
                      </div>

                      {/* Event Name */}
                      <p className="text-sm font-medium leading-snug">{event.title}</p>

                      {/* Forecast & Previous */}
                      {(event.forecast || event.previous) && (
                        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                          {event.forecast && (
                            <span className="text-[var(--muted)]">
                              Forecast: <span className="text-white font-medium">{event.forecast}</span>
                            </span>
                          )}
                          {event.previous && (
                            <span className="text-[var(--muted)]">
                              Prev: <span className="text-white/60">{event.previous}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="p-6 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <span className="material-symbols-outlined text-3xl text-[var(--muted)] mb-2 block">event_busy</span>
          <p className="text-sm text-[var(--muted)]">No upcoming events</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--card-border)]">
        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Impact:</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--danger)]" />
          <span className="text-[10px] text-[var(--muted)]">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
          <span className="text-[10px] text-[var(--muted)]">Med</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[var(--muted)]" />
          <span className="text-[10px] text-[var(--muted)]">Low</span>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-[9px] text-[var(--muted)] mt-2 text-center">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
