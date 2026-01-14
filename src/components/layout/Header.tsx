'use client'

import Link from 'next/link'
import { Bell, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { profile } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-[var(--background)] border-b border-[var(--card-border)] md:hidden">
      <div className="flex items-center justify-between h-16 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
            <span className="text-black font-bold">PG</span>
          </div>
          <span className="font-bold text-[var(--gold)]">Pure Gold</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/notifications" className="p-2 rounded-lg hover:bg-[var(--card-bg)] transition-colors">
            <Bell size={20} />
          </Link>
          <Link href="/settings" className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center text-black font-bold text-sm">
            {profile?.display_name?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
          </Link>
        </div>
      </div>
    </header>
  )
}
