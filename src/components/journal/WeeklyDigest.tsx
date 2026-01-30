'use client'

import { WeeklyReview } from '@/components/journal/WeeklyReview'

/**
 * WeeklyDigest is now a thin wrapper around the enhanced WeeklyReview component.
 * Kept for backward compatibility with any imports.
 */
export function WeeklyDigest() {
  return <WeeklyReview />
}
