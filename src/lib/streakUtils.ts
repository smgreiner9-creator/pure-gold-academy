/**
 * Streak calculation utilities with rest day support
 */

export interface StreakResult {
  currentStreak: number
  restDaysUsedThisWeek: number
  restDaysAvailable: number
  hasCheckedInToday: boolean
  hasTradedToday: boolean
}

/**
 * Calculate streak with rest day allowance
 *
 * @param tradeDates - Array of dates (YYYY-MM-DD) with trades
 * @param checkinDates - Array of dates (YYYY-MM-DD) with check-ins (no trade days)
 * @param allowedRestDaysPerWeek - Number of rest days allowed per 7-day rolling window (default: 1)
 * @returns StreakResult with current streak and rest day info
 */
export function calculateStreak(
  tradeDates: string[],
  checkinDates: string[],
  allowedRestDaysPerWeek: number = 1
): StreakResult {
  const today = new Date().toISOString().split('T')[0]

  // Combine all active dates (trades + check-ins)
  const activeDatesSet = new Set([...tradeDates, ...checkinDates])
  const tradeDatesSet = new Set(tradeDates)
  const checkinDatesSet = new Set(checkinDates)

  // Check today's status
  const hasTradedToday = tradeDatesSet.has(today)
  const hasCheckedInToday = checkinDatesSet.has(today) || hasTradedToday

  // Walk backwards from today to calculate streak
  let streak = 0
  let restDaysUsed = 0
  let consecutiveGaps = 0

  for (let i = 0; i < 365; i++) { // Max 1 year lookback
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (activeDatesSet.has(dateStr)) {
      // Active day (trade or check-in)
      streak++
      consecutiveGaps = 0
    } else {
      // Gap day
      consecutiveGaps++

      // Check if we can use a rest day
      // Calculate rest days used in the last 7 days from this point
      const weekStart = new Date(checkDate)
      weekStart.setDate(weekStart.getDate() - 6)

      let restDaysInWindow = 0
      for (let j = 0; j < 7; j++) {
        const windowDate = new Date(weekStart)
        windowDate.setDate(windowDate.getDate() + j)
        const windowDateStr = windowDate.toISOString().split('T')[0]

        // Count days that are gaps within the current streak period
        if (!activeDatesSet.has(windowDateStr) && windowDate <= checkDate) {
          restDaysInWindow++
        }
      }

      if (restDaysInWindow <= allowedRestDaysPerWeek && consecutiveGaps <= 1) {
        // Can use rest day - streak continues
        restDaysUsed++
        streak++ // Rest day counts toward streak
      } else {
        // Too many gaps - streak breaks
        break
      }
    }
  }

  // Calculate rest days used this week (last 7 days)
  let restDaysUsedThisWeek = 0
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (!activeDatesSet.has(dateStr)) {
      restDaysUsedThisWeek++
    }
  }

  // Adjust if today hasn't been checked in yet
  if (!hasCheckedInToday) {
    restDaysUsedThisWeek = Math.max(0, restDaysUsedThisWeek - 1)
  }

  return {
    currentStreak: streak,
    restDaysUsedThisWeek: Math.min(restDaysUsedThisWeek, allowedRestDaysPerWeek),
    restDaysAvailable: Math.max(0, allowedRestDaysPerWeek - restDaysUsedThisWeek),
    hasCheckedInToday,
    hasTradedToday,
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDate()
}
