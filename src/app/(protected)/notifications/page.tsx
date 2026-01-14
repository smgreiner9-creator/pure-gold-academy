'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, Button } from '@/components/ui'
import { Bell, Check, CheckCheck, MessageSquare, PenTool, GraduationCap, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Notification } from '@/types/database'

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (profile?.id) {
      loadNotifications()
    }
  }, [profile?.id])

  const loadNotifications = async () => {
    if (!profile?.id) return

    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)

      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!profile?.id) return

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false)

      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id)
      setNotifications(notifications.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'feedback':
        return <PenTool size={18} className="text-[var(--gold)]" />
      case 'comment':
        return <MessageSquare size={18} className="text-[var(--success)]" />
      case 'content':
        return <GraduationCap size={18} className="text-[var(--gold)]" />
      default:
        return <Bell size={18} className="text-[var(--muted)]" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse h-20" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-[var(--muted)]">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck size={18} />
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="text-center py-12">
          <Bell size={48} className="mx-auto text-[var(--muted)] mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Notifications</h3>
          <p className="text-[var(--muted)]">
            You&apos;re all caught up!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={`transition-colors ${!notification.read ? 'border-[var(--gold)]' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${!notification.read ? 'bg-[var(--gold)]/10' : 'bg-[var(--background)]'}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-medium ${!notification.read ? '' : 'text-[var(--muted)]'}`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted)]">{notification.message}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">{formatDate(notification.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 rounded hover:bg-[var(--background)] transition-colors"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {notification.link && (
                    <Link href={notification.link}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 rounded hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
