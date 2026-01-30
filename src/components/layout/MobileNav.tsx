'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'

interface NavItem {
  href: string
  label: string
  icon: string
}

const tradingTabs: NavItem[] = [
  { href: '/journal', label: 'Journal', icon: 'auto_stories' },
  { href: '/journal/analytics', label: 'Insights', icon: 'insights' },
  { href: '/learn', label: 'Learn', icon: 'school' },
  { href: '/settings', label: 'Profile', icon: 'person' },
]

const teachingTabs: NavItem[] = [
  { href: '/teacher', label: 'Dashboard', icon: 'dashboard' },
  { href: '/teacher/topics', label: 'Topics', icon: 'topic' },
  { href: '/teacher/students', label: 'Students', icon: 'people' },
  { href: '/settings', label: 'Profile', icon: 'person' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { isTeacher } = useAuth()
  const { teacherMode } = useAuthStore()

  const isInTeachingMode = isTeacher && teacherMode === 'teaching'
  const tabs = isInTeachingMode ? teachingTabs : tradingTabs

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
    if (href === '/settings') {
      return pathname === '/settings' || pathname.startsWith('/settings/')
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-[#F5F5F7] border-t border-black/[0.06]">
      <div className="flex justify-around items-center h-[60px] px-2 pb-safe">
        {tabs.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl flex-1 transition-colors ${
                active
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
