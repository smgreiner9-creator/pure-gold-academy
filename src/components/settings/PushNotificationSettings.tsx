'use client'


import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Card, Button } from '@/components/ui'

export function PushNotificationSettings() {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications()

  if (!isSupported) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-[var(--muted)]/10">
            <span className="material-symbols-outlined text-2xl text-[var(--muted)]">notifications_off</span>
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
              <span className="material-symbols-outlined text-2xl text-[var(--success)]">notifications</span>
            ) : (
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">notifications_off</span>
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
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
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
