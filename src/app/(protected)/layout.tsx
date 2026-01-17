'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { StatsHeader } from '@/components/layout/StatsHeader'
import { FloatingActionButton } from '@/components/layout/FloatingActionButton'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-20 lg:ml-64">
        {/* Stats Header Bar */}
        <StatsHeader />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Floating Action Button for Quick Trade */}
      <FloatingActionButton />
    </div>
  )
}
