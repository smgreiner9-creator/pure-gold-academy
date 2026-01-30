'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'
import { useSidebarStore } from '@/store/sidebar'
import { motion } from 'framer-motion'
import { UserPopover } from './UserPopover'
import type { OnboardingState } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: string
  minTrades?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const tradingGroups: NavGroup[] = [
  {
    label: 'Trading',
    items: [
      { href: '/journal', label: 'Journal', icon: 'auto_stories' },
      { href: '/journal/analytics', label: 'Insights', icon: 'insights', minTrades: 5 },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/learn', label: 'Learn', icon: 'school' },
      { href: '/community', label: 'Community', icon: 'groups', minTrades: 5 },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: 'settings' },
      { href: '/notifications', label: 'Notifications', icon: 'notifications' },
    ],
  },
]

const teachingGroups: NavGroup[] = [
  {
    label: 'Teaching',
    items: [
      { href: '/teacher', label: 'Dashboard', icon: 'dashboard' },
      { href: '/teacher/topics', label: 'Topics', icon: 'topic' },
      { href: '/teacher/lessons/new', label: 'Add Lesson', icon: 'add_circle' },
      { href: '/teacher/trade-calls', label: 'Trade Calls', icon: 'trending_up' },
      { href: '/teacher/live', label: 'Live Sessions', icon: 'videocam' },
      { href: '/teacher/students', label: 'Students', icon: 'people' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/teacher/settings', label: 'Settings', icon: 'settings' },
      { href: '/notifications', label: 'Notifications', icon: 'notifications' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut, isTeacher } = useAuth()
  const { teacherMode, setTeacherMode } = useAuthStore()
  const { isExpanded, toggleExpand } = useSidebarStore()
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)

  const isInTeachingMode = isTeacher && teacherMode === 'teaching'
  const activeGroups = isInTeachingMode ? teachingGroups : tradingGroups
  const onboarding = profile?.onboarding_state as OnboardingState | null
  const tradesLogged = onboarding?.trades_logged ?? 0

  const isActive = (href: string) => {
    if (href === '/journal') {
      return pathname === '/journal' || (pathname.startsWith('/journal/') && !pathname.startsWith('/journal/analytics'))
    }
    if (href === '/journal/analytics') {
      return pathname.startsWith('/journal/analytics')
    }
    if (href === '/teacher') {
      return pathname === '/teacher'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <motion.aside
      animate={{ width: isExpanded ? 220 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-full bg-[#F5F5F7] border-r border-black/[0.06] flex flex-col z-50 overflow-hidden"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-3 shrink-0">
        <Link href="/journal" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 gold-gradient rounded-lg flex items-center justify-center font-bold text-black text-base shrink-0">
            PG
          </div>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-w-0"
            >
              <h2 className="font-bold text-xs leading-tight uppercase tracking-[0.2em] text-[var(--foreground)]">Pure Gold</h2>
              <p className="text-[9px] text-[var(--muted)]">Trading Academy</p>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Teacher mode toggle */}
      {isTeacher && (
        <div className="px-3 mb-2 shrink-0">
          {isExpanded ? (
            <div className="flex bg-black/[0.04] rounded-lg p-0.5">
              <button
                onClick={() => setTeacherMode('trading')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  teacherMode === 'trading'
                    ? 'bg-white text-[var(--gold)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Trading
              </button>
              <button
                onClick={() => setTeacherMode('teaching')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  teacherMode === 'teaching'
                    ? 'bg-white text-[var(--gold)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                Teaching
              </button>
            </div>
          ) : (
            <button
              onClick={() => setTeacherMode(teacherMode === 'trading' ? 'teaching' : 'trading')}
              className="w-10 h-10 mx-auto rounded-lg border border-black/[0.06] flex items-center justify-center text-[var(--muted)] hover:text-[var(--gold)] hover:border-[var(--gold)]/20 transition-all"
              title={teacherMode === 'trading' ? 'Switch to Teaching' : 'Switch to Trading'}
            >
              <span className="material-symbols-outlined text-lg">
                {teacherMode === 'trading' ? 'school' : 'auto_stories'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Navigation groups */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1">
        {activeGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && (
              <div className="mx-2 my-2 border-t border-black/[0.06]" />
            )}
            {isExpanded && (
              <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest px-3 mb-1 mt-2">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                const locked = item.minTrades !== undefined && tradesLogged < item.minTrades

                if (locked) {
                  return (
                    <div key={item.href} className="relative group">
                      <span
                        className={`flex items-center gap-3 h-10 rounded-lg text-[var(--muted)]/40 cursor-default ${
                          isExpanded ? 'px-3' : 'justify-center'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl shrink-0">lock</span>
                        {isExpanded && (
                          <span className="text-sm font-medium truncate">{item.label}</span>
                        )}
                      </span>
                      {!isExpanded && (
                        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#1D1D1F] text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.label} (unlock at {item.minTrades} trades)
                        </span>
                      )}
                    </div>
                  )
                }

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 h-10 rounded-lg transition-all ${
                        isExpanded ? 'px-3' : 'justify-center'
                      } ${
                        active
                          ? 'rail-active-bar text-[var(--gold)] bg-[var(--gold)]/[0.06]'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/[0.03]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl shrink-0">{item.icon}</span>
                      {isExpanded && (
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      )}
                    </Link>
                    {!isExpanded && (
                      <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#1D1D1F] text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-black/[0.06] p-2 space-y-1 relative">
        {/* Expand/Collapse button */}
        <button
          onClick={toggleExpand}
          className={`flex items-center gap-3 h-9 rounded-lg text-sm font-medium transition-all hover:bg-black/[0.03] ${
            isExpanded
              ? 'w-full px-3 text-[var(--muted)] hover:text-[var(--foreground)]'
              : 'w-full justify-center text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="material-symbols-outlined text-lg shrink-0">
            {isExpanded ? 'close_fullscreen' : 'open_in_full'}
          </span>
          {isExpanded && (
            <span className="truncate">Collapse</span>
          )}
        </button>

        {/* User avatar */}
        <button
          onClick={() => setUserPopoverOpen(!userPopoverOpen)}
          className={`flex items-center gap-3 h-10 rounded-lg transition-all w-full hover:bg-black/[0.03] ${
            isExpanded ? 'px-3' : 'justify-center'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-black/[0.04] border border-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] font-bold text-sm shrink-0">
            {profile?.display_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold truncate">
                {profile?.display_name || profile?.email || 'User'}
              </p>
              <p className="text-[10px] text-[var(--muted)] uppercase">
                {profile?.role || 'Student'}
              </p>
            </div>
          )}
        </button>

        {/* User Popover */}
        <UserPopover
          isOpen={userPopoverOpen}
          onClose={() => setUserPopoverOpen(false)}
          displayName={profile?.display_name}
          email={profile?.email}
          role={profile?.role}
          onSignOut={signOut}
        />
      </div>
    </motion.aside>
  )
}
