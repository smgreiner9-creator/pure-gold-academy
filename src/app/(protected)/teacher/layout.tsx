'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isLoading, isTeacher } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to load before checking
    if (!isLoading && profile && !isTeacher) {
      router.push('/dashboard')
    }
  }, [profile, isLoading, isTeacher, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 gold-gradient rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-black text-2xl">school</span>
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

  // Show access denied briefly before redirect
  if (!isTeacher) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--danger)]">lock</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Teacher Access Only</h2>
          <p className="text-[var(--muted)] text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
