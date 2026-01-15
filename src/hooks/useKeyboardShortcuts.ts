'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ShortcutConfig {
  onQuickTrade?: () => void
  onFocusCalculator?: () => void
}

export function useKeyboardShortcuts(config: ShortcutConfig = {}) {
  const router = useRouter()

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input field
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return
    }

    // Ignore if modifier keys are pressed (except for specific combos)
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    switch (event.key.toLowerCase()) {
      case 'n':
        // New journal entry
        event.preventDefault()
        router.push('/journal/new')
        break

      case 'j':
        // Go to journal
        event.preventDefault()
        router.push('/journal')
        break

      case 'c':
        // Focus calculator (scroll to it and focus first input)
        event.preventDefault()
        if (config.onFocusCalculator) {
          config.onFocusCalculator()
        } else {
          const calculator = document.querySelector('[data-calculator]')
          if (calculator) {
            calculator.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const firstInput = calculator.querySelector('input')
            if (firstInput) {
              setTimeout(() => firstInput.focus(), 300)
            }
          }
        }
        break

      case 'q':
        // Quick trade entry
        event.preventDefault()
        if (config.onQuickTrade) {
          config.onQuickTrade()
        }
        break

      case 'd':
        // Go to dashboard
        event.preventDefault()
        router.push('/dashboard')
        break

      case 'l':
        // Go to learn
        event.preventDefault()
        router.push('/learn')
        break

      case '?':
        // Show shortcuts help (could trigger a modal)
        event.preventDefault()
        // Could dispatch a custom event to show shortcuts modal
        window.dispatchEvent(new CustomEvent('show-shortcuts-help'))
        break
    }
  }, [router, config])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Shortcuts reference for display
export const KEYBOARD_SHORTCUTS = [
  { key: 'N', description: 'New journal entry' },
  { key: 'J', description: 'Go to journal' },
  { key: 'C', description: 'Focus calculator' },
  { key: 'Q', description: 'Quick trade entry' },
  { key: 'D', description: 'Go to dashboard' },
  { key: 'L', description: 'Go to learn' },
  { key: '?', description: 'Show shortcuts' },
]
