'use client'

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Card, Button } from '@/components/ui'

export function PushNotificationSettings() {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications()

  if (!isSupported) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-[var(--muted)]/10">
            <BellOff size={24} className="text-[var(--muted)]" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Push Notifications</h3>
            <p className="text-sm text-[var(--muted)]">
              Push notifications are not supported in your browser.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${isSubscribed ? 'bg-[var(--success)]/10' : 'bg-[var(--gold)]/10'}`}>
            {isSubscribed ? (
              <Bell size={24} className="text-[var(--success)]" />
            ) : (
              <BellOff size={24} className="text-[var(--gold)]" />
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-1">Push Notifications</h3>
            <p className="text-sm text-[var(--muted)]">
              {isSubscribed
                ? 'You will receive notifications for journal feedback, new content, and community activity.'
                : 'Enable push notifications to stay updated on journal feedback and new content.'}
            </p>
            {error && <p className="text-sm text-[var(--danger)] mt-2">{error}</p>}
          </div>
        </div>

        <Button
          variant={isSubscribed ? 'outline' : 'gold'}
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </Button>
      </div>
    </Card>
  )
}
