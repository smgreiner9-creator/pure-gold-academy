'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  href: string
  label: string
  icon: string
  teacherOnly?: boolean
  studentOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/journal', label: 'Journal', icon: 'auto_stories' },
  { href: '/learn', label: 'Learn', icon: 'school' },
  { href: '/community', label: 'Community', icon: 'groups' },
  { href: '/teacher', label: 'Teacher Panel', icon: 'admin_panel_settings', teacherOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut, isTeacher, isPremium } = useAuth()

  const filteredNavItems = navItems.filter(item => {
    if (item.teacherOnly && !isTeacher) return false
    if (item.studentOnly && isTeacher) return false
    return true
  })

  return (
    <aside className="sidebar-3d fixed left-0 top-0 h-full w-20 lg:w-64 flex flex-col z-50">
      {/* Logo */}
      <div className="p-4 lg:p-6 flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 gold-gradient rounded-lg flex items-center justify-center font-bold text-black text-xl shrink-0">
            PG
          </div>
          <div className="hidden lg:block">
            <h2 className="font-bold text-sm leading-tight uppercase tracking-widest text-white">Pure Gold</h2>
            <p className="text-[10px] text-[var(--muted)]">Trading Academy</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 space-y-2 mt-4">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all group ${
                isActive
                  ? 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20'
                  : 'text-[var(--muted)] hover:text-white border border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="hidden lg:block text-sm font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 lg:p-4 border-t border-[var(--card-border)] space-y-4">
        {/* Subscription Card - Desktop Only */}
        <div className="hidden lg:block p-4 rounded-xl bg-gradient-to-br from-[var(--gold)]/20 to-transparent border border-[var(--gold)]/10">
          <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-tight mb-1">
            {isPremium ? 'Elite Plan' : 'Free Plan'}
          </p>
          <p className="text-xs text-[var(--muted)] mb-3">
            {isPremium ? '$2.80/month active' : 'Upgrade for full access'}
          </p>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full gold-gradient ${isPremium ? 'w-3/4' : 'w-1/4'}`}></div>
          </div>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex items-center justify-center text-[var(--gold)] font-bold shrink-0">
            {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{profile?.email || 'User'}</p>
            <p className="text-[10px] text-[var(--muted)] uppercase">{profile?.role || 'Student'}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="material-symbols-outlined text-[var(--muted)] hover:text-white shrink-0 text-xl"
          >
            logout
          </button>
        </div>
      </div>
    </aside>
  )
}
