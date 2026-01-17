'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings'
import { StreakBadges } from '@/components/dashboard/StreakBadges'

export default function SettingsPage() {
  const router = useRouter()
  const { profile, signOut, isPremium } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [classroomCode, setClassroomCode] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }
  }, [profile?.display_name])

  const updateProfile = async () => {
    if (!profile?.id) return

    setIsUpdating(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() || null })
        .eq('id', profile.id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setIsUpdating(false)
    }
  }

  const joinClassroom = async () => {
    if (!profile?.id || !classroomCode.trim()) return

    setIsJoining(true)
    setMessage(null)
    try {
      // Validate the invite code exists
      const { data: classroom, error: findError } = await supabase
        .from('classrooms')
        .select('id, invite_code')
        .eq('invite_code', classroomCode.trim().toLowerCase())
        .single()

      if (findError || !classroom) {
        setMessage({ type: 'error', text: 'Invalid invite code' })
        setIsJoining(false)
        return
      }

      // Redirect to the join page to handle free/paid flow
      router.push(`/classroom/join/${classroom.invite_code}`)
    } catch (error) {
      console.error('Error finding classroom:', error)
      setMessage({ type: 'error', text: 'Failed to find classroom' })
      setIsJoining(false)
    }
  }

  const leaveClassroom = async () => {
    if (!profile?.id || !profile.classroom_id) return
    if (!confirm('Are you sure you want to leave this classroom?')) return

    try {
      await supabase
        .from('profiles')
        .update({ classroom_id: null })
        .eq('id', profile.id)

      window.location.reload()
    } catch (error) {
      console.error('Error leaving classroom:', error)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--muted)] text-sm">Manage your account and preferences</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border ${
          message.type === 'error'
            ? 'bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]'
            : 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">
              {message.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-[var(--gold)]">person</span>
          </div>
          <h3 className="font-bold text-lg">Profile</h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Email</p>
            <p className="font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Role</p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold ${
              profile?.role === 'teacher'
                ? 'bg-[var(--gold)]/10 text-[var(--gold)]'
                : 'bg-white/5 text-white'
            }`}>
              <span className="material-symbols-outlined text-sm">
                {profile?.role === 'teacher' ? 'school' : 'person'}
              </span>
              {profile?.role === 'teacher' ? 'Teacher' : 'Student'}
            </span>
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
            />
          </div>
          <button
            onClick={updateProfile}
            disabled={isUpdating}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
          >
            {isUpdating ? (
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-[var(--gold)]">credit_card</span>
            </div>
            <h3 className="font-bold text-lg">Subscription</h3>
          </div>
          {isPremium && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] text-sm font-bold">
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
              Premium
            </span>
          )}
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-black/20 border border-[var(--card-border)]">
            <p className="font-bold">
              {isPremium ? 'Premium Plan' : 'Free Plan'}
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">
              {isPremium
                ? 'You have access to all premium features'
                : 'Upgrade to unlock all features'}
            </p>
          </div>
          {!isPremium && (
            <Link
              href="/settings/subscription"
              className="gold-gradient text-black font-bold h-12 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm w-full"
            >
              <span className="material-symbols-outlined text-lg">workspace_premium</span>
              Upgrade to Premium - $2.80/month
            </Link>
          )}
          {isPremium && (
            <Link
              href="/settings/subscription"
              className="h-12 px-6 rounded-xl border border-[var(--card-border)] flex items-center justify-center gap-2 font-semibold hover:bg-white/5 transition-colors text-sm w-full"
            >
              Manage Subscription
            </Link>
          )}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-[var(--gold)]">notifications</span>
          </div>
          <h3 className="font-bold text-lg">Notifications</h3>
        </div>
        <PushNotificationSettings />
      </div>

      {/* Achievements Section */}
      <StreakBadges />

      {/* Classroom Section (Students only) */}
      {profile?.role === 'student' && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-[var(--gold)]">school</span>
            </div>
            <h3 className="font-bold text-lg">Classroom</h3>
          </div>
          <div className="space-y-4">
            {profile.classroom_id ? (
              <>
                <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-lg text-[var(--success)]">check_circle</span>
                    <p className="font-bold text-[var(--success)]">Currently enrolled</p>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    You&apos;re part of a classroom and can access shared content
                  </p>
                </div>
                <button
                  onClick={leaveClassroom}
                  className="h-10 px-6 rounded-xl border border-[var(--danger)]/50 text-[var(--danger)] flex items-center justify-center gap-2 font-semibold hover:bg-[var(--danger)]/10 transition-colors text-sm"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Leave Classroom
                </button>
              </>
            ) : (
              <>
                <p className="text-[var(--muted)] text-sm">
                  Enter an invite code from your teacher to join a classroom
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={classroomCode}
                    onChange={(e) => setClassroomCode(e.target.value)}
                    placeholder="Enter invite code"
                    className="flex-1 bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                  />
                  <button
                    onClick={joinClassroom}
                    disabled={isJoining || !classroomCode.trim()}
                    className="gold-gradient text-black font-bold h-12 px-6 rounded-xl flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                  >
                    {isJoining ? (
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    ) : (
                      'Join'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <button
          onClick={signOut}
          className="w-full h-12 rounded-xl border border-[var(--danger)]/50 text-[var(--danger)] flex items-center justify-center gap-2 font-bold hover:bg-[var(--danger)]/10 transition-colors text-sm"
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}
