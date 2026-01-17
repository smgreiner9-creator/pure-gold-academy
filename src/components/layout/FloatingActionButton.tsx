'use client'

import { useState } from 'react'
import { QuickTradeEntry } from '@/components/dashboard/QuickTradeEntry'

export function FloatingActionButton() {
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false)

  return (
    <>
      {/* FAB Button - pill shape with text, bottom-right */}
      <button
        onClick={() => setIsQuickTradeOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 h-12 px-5 gold-gradient rounded-full flex items-center justify-center gap-2 shadow-lg gold-glow hover:scale-105 active:scale-95 transition-transform"
        aria-label="Quick trade entry"
      >
        <span className="material-symbols-outlined text-black text-xl">add</span>
        <span className="text-black font-bold text-sm">Trade</span>
      </button>

      {/* QuickTradeEntry Modal */}
      <QuickTradeEntry
        isOpen={isQuickTradeOpen}
        onClose={() => setIsQuickTradeOpen(false)}
      />
    </>
  )
}
