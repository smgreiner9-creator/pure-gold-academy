'use client'

import { useState } from 'react'

interface TradingViewEmbedProps {
  url: string
  title?: string
  className?: string
  height?: number
}

export function TradingViewEmbed({ url, title, className = '', height = 400 }: TradingViewEmbedProps) {
  const [hasError, setHasError] = useState(false)

  // TradingView snapshots/charts often don't allow iframe embedding
  // So we provide a clickable preview with link to open
  if (hasError || !url.includes('tradingview.com')) {
    return (
      <div className={`glass-surface rounded-lg p-4 text-center ${className}`}>
        <p className="text-[var(--muted)]">Unable to embed chart</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--gold)] hover:underline inline-flex items-center gap-1 mt-2"
        >
          Open in TradingView <span className="material-symbols-outlined text-sm">open_in_new</span>
        </a>
      </div>
    )
  }

  // Check if it's a shared chart that might be embeddable
  const isSnapshot = url.includes('/x/') || url.includes('s.tradingview.com')

  if (isSnapshot) {
    return (
      <div className={`relative rounded-lg overflow-hidden glass-surface ${className}`}>
        {/* Preview card */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 hover:bg-black/[0.04] transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--gold)]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[var(--gold)]">bar_chart</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold">{title || 'TradingView Chart'}</p>
              <p className="text-sm text-[var(--muted)] truncate">{url}</p>
            </div>
            <span className="material-symbols-outlined text-xl text-[var(--muted)]">open_in_new</span>
          </div>
        </a>
      </div>
    )
  }

  // For regular TradingView widget/chart URLs, try iframe
  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <iframe
        src={url}
        title={title || 'TradingView Chart'}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        onError={() => setHasError(true)}
      />
    </div>
  )
}
