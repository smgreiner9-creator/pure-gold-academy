'use client'

import { useState, useEffect } from 'react'

interface NewsEvent {
  date: string
  time: string
  currency: string
  impact: string
  event: string
}

export function NextNewsCountdown() {
  const [nextEvent, setNextEvent] = useState<(NewsEvent & { eventDate: string }) | null>(null)
  const [countdown, setCountdown] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const parseEventDateTime = (event: NewsEvent): Date | null => {
    if (!event.date || !event.time) return null
    if (event.time === 'All Day' || event.time === 'Tentative') return null

    const timeMatch = event.time.match(/(\d+):(\d+)(am|pm)/i)
    if (!timeMatch) return null

    const [month, day, year] = event.date.split('-').map(Number)
    if (!month || !day || !year) return null

    let hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    const ampm = timeMatch[3].toLowerCase()

    if (ampm === 'pm' && hours !== 12) hours += 12
    if (ampm === 'am' && hours === 12) hours = 0

    return new Date(year, month - 1, day, hours, minutes, 0, 0)
  }

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/forex-factory')
        const data = await res.json()

        if (data.events && data.events.length > 0) {
          // Filter for high impact events only
          const highImpactEvents = data.events.filter(
            (e: NewsEvent) => e.impact === 'High' || e.impact === 'Medium'
          )

          if (highImpactEvents.length > 0) {
            // Find the next upcoming event across dates
            const now = new Date()
            let nextCandidate: { event: NewsEvent; date: Date } | null = null

            for (const event of highImpactEvents) {
              const eventDate = parseEventDateTime(event)
              if (!eventDate) continue
              if (eventDate <= now) continue
              if (!nextCandidate || eventDate < nextCandidate.date) {
                nextCandidate = { event, date: eventDate }
              }
            }

            if (nextCandidate) {
              setNextEvent({
                ...nextCandidate.event,
                eventDate: nextCandidate.date.toISOString(),
              })
            } else {
              setNextEvent(null)
            }
          } else {
            setNextEvent(null)
          }
        } else {
          setNextEvent(null)
        }
      } catch (error) {
        console.error('Error fetching news:', error)
        setNextEvent(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNews()
    const interval = setInterval(fetchNews, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!nextEvent) return

    const updateCountdown = () => {
      const now = new Date()
      const eventDate = new Date(nextEvent.eventDate)
      const diff = eventDate.getTime() - now.getTime()

      if (diff <= 0) {
        setCountdown('NOW')
        return
      }

      const hoursLeft = Math.floor(diff / (1000 * 60 * 60))
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000)

      if (hoursLeft > 0) {
        setCountdown(`${hoursLeft}h ${minutesLeft}m`)
      } else if (minutesLeft > 0) {
        setCountdown(`${minutesLeft}m ${secondsLeft}s`)
      } else {
        setCountdown(`${secondsLeft}s`)
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [nextEvent])

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl glass-surface animate-pulse">
        <div className="h-4 bg-black/5 rounded w-1/2 mb-2" />
        <div className="h-6 bg-black/5 rounded w-3/4" />
      </div>
    )
  }

  if (!nextEvent) {
    return (
      <div className="p-4 rounded-xl glass-surface">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <span className="material-symbols-outlined text-lg">event_available</span>
          <span className="text-sm">No high-impact news today</span>
        </div>
      </div>
    )
  }

  const isUrgent = countdown === 'NOW' || (countdown.includes('m') && !countdown.includes('h'))

  return (
    <div className={`p-4 rounded-xl border ${
      isUrgent
        ? 'border-[var(--danger)]/50 bg-[var(--danger)]/5'
        : 'border-[var(--glass-surface-border)] bg-black/[0.03]'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            nextEvent.impact === 'High'
              ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
              : 'bg-[var(--warning)]/10 text-[var(--warning)]'
          }`}>
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
              Next {nextEvent.impact} Impact
            </p>
            <p className="text-sm font-semibold truncate">
              <span className="text-[var(--gold)]">{nextEvent.currency}</span>
              {' '}{nextEvent.event}
            </p>
            <p className="text-xs text-[var(--muted)]">{nextEvent.time}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`mono-num text-xl font-bold ${
            isUrgent ? 'text-[var(--danger)]' : 'text-[var(--gold)]'
          }`}>
            {countdown}
          </p>
        </div>
      </div>
    </div>
  )
}
