'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { useSidebarStore } from '@/store/sidebar'
import { useAuth } from '@/hooks/useAuth'
import type { OnboardingState } from '@/types/database'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isExpanded = useSidebarStore((s) => s.isExpanded)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  // Redirect to onboarding if not completed (skip if already on onboarding page)
  useEffect(() => {
    if (isLoading || !profile || pathname.startsWith('/onboarding')) return

    const onboarding = profile.onboarding_state as OnboardingState | null
    if (!onboarding?.completed_at) {
      router.push('/onboarding')
    }
  }, [isLoading, profile, pathname, router])

  if (isLoading) {
    return (
      <div className="theme-light min-h-screen flex items-center justify-center bg-[#F5F5F7] text-[#1D1D1F]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 gold-gradient rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xl">PG</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[var(--gold)] rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-[var(--gold)] rounded-full animate-pulse delay-75" />
            <div className="w-2 h-2 bg-[var(--gold)] rounded-full animate-pulse delay-150" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="theme-light min-h-screen flex overflow-hidden bg-[#F5F5F7] text-[#1D1D1F]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden md:transition-[margin-left] md:duration-200 ${
        isExpanded ? 'md:ml-[220px]' : 'md:ml-16'
      }`}>
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  )
}
