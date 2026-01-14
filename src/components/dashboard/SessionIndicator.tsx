'use client'

import { useState, useEffect } from 'react'

interface Session {
  name: string
  shortName: string
  startUTC: number
  endUTC: number
  color: string
  bgColor: string
  icon: string
}

const sessions: Session[] = [
  { name: 'Sydney', shortName: 'SYD', startUTC: 21, endUTC: 6, color: 'text-purple-400', bgColor: 'bg-purple-500', icon: 'dark_mode' },
  { name: 'Tokyo', shortName: 'TOK', startUTC: 0, endUTC: 9, color: 'text-red-400', bgColor: 'bg-red-500', icon: 'wb_sunny' },
  { name: 'London', shortName: 'LON', startUTC: 7, endUTC: 16, color: 'text-blue-400', bgColor: 'bg-blue-500', icon: 'location_city' },
  { name: 'New York', shortName: 'NY', startUTC: 12, endUTC: 21, color: 'text-green-400', bgColor: 'bg-green-500', icon: 'apartment' },
]

// Prime trading hours for Gold (NY session 6:30-11:00 AM EST = 11:30-16:00 UTC)
const primeHours = { start: 11.5, end: 16 }

export function SessionIndicator() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const utcHour = currentTime.getUTCHours()
  const utcMinutes = currentTime.getUTCMinutes()
  const utcDecimal = utcHour + utcMinutes / 60
  const totalMinutes = utcHour * 60 + utcMinutes

  const isSessionActive = (session: Session) => {
    if (session.startUTC > session.endUTC) {
      // Crosses midnight (e.g., Sydney 21:00 - 06:00)
      return utcHour >= session.startUTC || utcHour < session.endUTC
    }
    return utcHour >= session.startUTC && utcHour < session.endUTC
  }

  const getSessionProgress = (session: Session) => {
    if (!isSessionActive(session)) return 0

    const sessionStart = session.startUTC * 60
    let sessionEnd = session.endUTC * 60
    let currentMinutes = totalMinutes

    // Handle sessions crossing midnight
    if (session.startUTC > session.endUTC) {
      sessionEnd += 24 * 60
      if (utcHour < session.startUTC) {
        currentMinutes += 24 * 60
      }
    }

    const sessionDuration = sessionEnd - sessionStart
    const elapsed = currentMinutes - sessionStart
    return Math.min(100, Math.max(0, (elapsed / sessionDuration) * 100))
  }

  const getTimeUntilChange = (session: Session) => {
    const active = isSessionActive(session)
    const targetHour = active ? session.endUTC : session.startUTC
    let hoursUntil = targetHour - utcHour

    if (hoursUntil <= 0) hoursUntil += 24
    if (hoursUntil > 12 && !active) hoursUntil -= 24
    if (hoursUntil < 0) hoursUntil += 24

    const minutesUntil = (hoursUntil * 60 - utcMinutes)
    const hours = Math.floor(minutesUntil / 60)
    const minutes = minutesUntil % 60

    if (hours <= 0 && minutes <= 0) return null
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const isPrimeTime = utcDecimal >= primeHours.start && utcDecimal < primeHours.end
  const activeSessions = sessions.filter(isSessionActive)
  const isOverlap = activeSessions.length > 1

  // Get current position on 24h timeline (for marker)
  const timelinePosition = (totalMinutes / (24 * 60)) * 100

  const getTimeUntilPrime = () => {
    if (isPrimeTime) return 'Active now'

    let hoursUntil = primeHours.start - utcDecimal
    if (hoursUntil < 0) hoursUntil += 24

    const hours = Math.floor(hoursUntil)
    const minutes = Math.round((hoursUntil - hours) * 60)

    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-4">
      {/* Active Session Banner */}
      <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Market Sessions</h3>
          <div className="flex items-center gap-2">
            <span className="mono-num text-xs">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center gap-3 mb-4">
          {activeSessions.length > 0 ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isOverlap ? 'bg-[var(--gold)]/10' : 'bg-[var(--success)]/10'}`}>
              <span className={`w-2 h-2 rounded-full ${isOverlap ? 'bg-[var(--gold)] animate-pulse' : 'bg-[var(--success)] animate-pulse'}`} />
              <span className={`text-sm font-bold ${isOverlap ? 'text-[var(--gold)]' : 'text-[var(--success)]'}`}>
                {isOverlap ? `${activeSessions.map(s => s.shortName).join(' + ')} Overlap` : `${activeSessions[0].name} Session`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
              <span className="w-2 h-2 rounded-full bg-[var(--muted)]" />
              <span className="text-sm font-medium text-[var(--muted)]">Markets Quiet</span>
            </div>
          )}

          {isPrimeTime && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--gold)]/10">
              <span className="material-symbols-outlined text-sm text-[var(--gold)]">bolt</span>
              <span className="text-sm font-bold text-[var(--gold)]">Prime Time</span>
            </div>
          )}
        </div>

        {/* 24h Timeline */}
        <div className="mb-4">
          <div className="relative h-4 bg-black/40 rounded-full overflow-hidden">
            {sessions.map(session => {
              const startPercent = (session.startUTC / 24) * 100
              const active = isSessionActive(session)

              if (session.startUTC > session.endUTC) {
                // Session crosses midnight - render two parts
                const firstPart = ((24 - session.startUTC) / 24) * 100
                const secondPart = (session.endUTC / 24) * 100
                return (
                  <div key={session.name}>
                    <div
                      className={`absolute h-full ${session.bgColor} ${active ? 'opacity-60' : 'opacity-20'}`}
                      style={{ left: `${startPercent}%`, width: `${firstPart}%` }}
                    />
                    <div
                      className={`absolute h-full ${session.bgColor} ${active ? 'opacity-60' : 'opacity-20'}`}
                      style={{ left: 0, width: `${secondPart}%` }}
                    />
                  </div>
                )
              }

              const width = ((session.endUTC - session.startUTC) / 24) * 100
              return (
                <div
                  key={session.name}
                  className={`absolute h-full ${session.bgColor} ${active ? 'opacity-60' : 'opacity-20'}`}
                  style={{ left: `${startPercent}%`, width: `${width}%` }}
                />
              )
            })}
            {/* Prime time overlay */}
            <div
              className="absolute h-full bg-[var(--gold)] opacity-20"
              style={{ left: `${(primeHours.start / 24) * 100}%`, width: `${((primeHours.end - primeHours.start) / 24) * 100}%` }}
            />
            {/* Current time marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg z-10"
              style={{ left: `${timelinePosition}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[9px] text-[var(--muted)] mono-num">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>

        {/* Session Grid */}
        <div className="grid grid-cols-2 gap-2">
          {sessions.map(session => {
            const active = isSessionActive(session)
            const progress = getSessionProgress(session)
            const timeUntil = getTimeUntilChange(session)

            return (
              <div
                key={session.name}
                className={`p-3 rounded-xl border transition-all ${
                  active
                    ? 'border-[var(--gold)]/30 bg-[var(--gold)]/5'
                    : 'border-[var(--card-border)] bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-sm ${active ? session.color : 'text-[var(--muted)]'}`}>
                      {session.icon}
                    </span>
                    <span className={`text-xs font-bold ${active ? 'text-white' : 'text-[var(--muted)]'}`}>
                      {session.name}
                    </span>
                  </div>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  )}
                </div>

                {active ? (
                  <>
                    <div className="h-1 bg-black/40 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full ${session.bgColor} rounded-full transition-all`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--muted)]">
                      {timeUntil ? `Closes in ${timeUntil}` : 'Closing soon'}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-[var(--muted)]">
                    {timeUntil ? `Opens in ${timeUntil}` : 'Opens soon'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Prime Time Info */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isPrimeTime
          ? 'border-[var(--gold)]/30 bg-[var(--gold)]/5'
          : 'border-[var(--card-border)] bg-[var(--card-bg)]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPrimeTime ? 'bg-[var(--gold)]/20' : 'bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isPrimeTime ? 'text-[var(--gold)]' : 'text-[var(--muted)]'}`}>
                {isPrimeTime ? 'bolt' : 'schedule'}
              </span>
            </div>
            <div>
              <p className={`text-sm font-bold ${isPrimeTime ? 'text-[var(--gold)]' : ''}`}>
                {isPrimeTime ? 'Prime Trading Time' : 'Off-Peak Hours'}
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                NY 6:30-11:00 AM EST • Best for Gold
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold mono-num ${isPrimeTime ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
              {getTimeUntilPrime()}
            </p>
            <p className="text-[10px] text-[var(--muted)]">
              {isPrimeTime ? 'until close' : 'until prime'}
            </p>
          </div>
        </div>
      </div>

      {/* Overlap Alert */}
      {isOverlap && (
        <div className="p-3 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20">
          <div className="flex items-center gap-2 text-xs text-[var(--gold)]">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span className="font-bold">Session Overlap Active</span>
          </div>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            Higher liquidity and volatility expected. Good conditions for scalping.
          </p>
        </div>
      )}
    </div>
  )
}
