'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

const DRAFT_PREFIX = 'pg_journal_draft_'
const SAVE_INTERVAL = 10000 // 10 seconds

export function useAutoSaveDraft<T>(userId: string | undefined, formData: T) {
  const [hasDraft, setHasDraft] = useState(false)
  const [restoredDraft, setRestoredDraft] = useState<T | null>(null)
  const lastSavedRef = useRef<string>('')

  const storageKey = userId ? `${DRAFT_PREFIX}${userId}` : null

  // Check for existing draft on mount
  useEffect(() => {
    if (!storageKey) return

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setRestoredDraft(parsed)
        setHasDraft(true)
      }
    } catch {
      // Invalid data, clear it
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // Auto-save on interval
  useEffect(() => {
    if (!storageKey) return

    const interval = setInterval(() => {
      try {
        const serialized = JSON.stringify(formData)
        // Only save if data actually changed
        if (serialized !== lastSavedRef.current) {
          localStorage.setItem(storageKey, serialized)
          lastSavedRef.current = serialized
        }
      } catch {
        // Silently fail on storage errors
      }
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [storageKey, formData])

  const clearDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey)
      lastSavedRef.current = ''
      setHasDraft(false)
      setRestoredDraft(null)
    }
  }, [storageKey])

  const dismissDraft = useCallback(() => {
    clearDraft()
  }, [clearDraft])

  return {
    hasDraft,
    restoredDraft,
    clearDraft,
    dismissDraft,
  }
}
