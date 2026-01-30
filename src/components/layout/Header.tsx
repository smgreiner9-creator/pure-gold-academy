'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { profile } = useAuth()

  return (
    <header className="sticky top-0 z-40 glass-surface rounded-none border-x-0 border-t-0 md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/journal" className="flex items-center gap-2">
          <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">PG</span>
          </div>
          <span className="font-bold text-[var(--gold)]">Pure Gold</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/notifications" className="p-2 rounded-lg hover:bg-black/[0.03] transition-colors">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </Link>
          <Link href="/settings" className="w-8 h-8 rounded-full bg-black/[0.04] flex items-center justify-center text-[var(--gold)] font-bold text-sm">
            {profile?.display_name?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
          </Link>
        </div>
      </div>
    </header>
  )
}
