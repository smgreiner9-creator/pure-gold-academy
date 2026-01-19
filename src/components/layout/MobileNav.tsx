'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  href: string
  label: string
  icon: string
  teacherOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/journal', label: 'Journal', icon: 'auto_stories' },
  { href: '/learn', label: 'Learn', icon: 'school' },
  { href: '/community', label: 'Community', icon: 'groups' },
  { href: '/teacher', label: 'Teacher', icon: 'admin_panel_settings', teacherOnly: true },
]

export function MobileNav() {
  const pathname = usePathname()
  const { isTeacher } = useAuth()

  const filteredNavItems = navItems.filter(item => {
    if (item.teacherOnly && !isTeacher) return false
    return true
  }).slice(0, 5) // Max 5 items for mobile nav

  return (
    <nav className="mobile-nav-3d fixed bottom-0 left-0 right-0 md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2 pb-safe">
        {filteredNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg flex-1 transition-colors ${
                isActive
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
