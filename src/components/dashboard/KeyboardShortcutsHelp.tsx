'use client'

import { useState, useEffect } from 'react'
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleShowHelp = () => setIsOpen(true)
    window.addEventListener('show-shortcuts-help', handleShowHelp)
    return () => window.removeEventListener('show-shortcuts-help', handleShowHelp)
  }, [])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto glass-floating rounded-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-surface-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
              <span className="material-symbols-outlined">keyboard</span>
            </div>
            <h2 className="font-bold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 space-y-2">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-black/5"
            >
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 rounded bg-black/[0.06] text-xs font-mono font-bold">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--glass-surface-border)]">
          <p className="text-xs text-[var(--muted)] text-center">
            Shortcuts work when not typing in an input field
          </p>
        </div>
      </div>
    </>
  )
}
