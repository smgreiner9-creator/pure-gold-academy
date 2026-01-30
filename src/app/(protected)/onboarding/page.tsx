'use client'

import { useAuth } from '@/hooks/useAuth'
import { StudentOnboarding } from '@/components/onboarding/StudentOnboarding'
import { TeacherOnboarding } from '@/components/onboarding/TeacherOnboarding'

export default function OnboardingPage() {
  const { profile, isLoading, isTeacher } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-2 h-2 bg-[var(--gold)] rounded-full animate-pulse" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      {isTeacher ? <TeacherOnboarding /> : <StudentOnboarding />}
    </div>
  )
}
