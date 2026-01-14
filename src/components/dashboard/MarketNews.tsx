'use client'

import { useState } from 'react'

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  sentiment?: 'bullish' | 'bearish' | 'neutral'
}

// Mock news data - in production, this would come from a news API
const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Gold Prices Rally as Dollar Weakens Amid Fed Rate Cut Expectations',
    source: 'Reuters',
    url: '#',
    publishedAt: new Date().toISOString(),
    sentiment: 'bullish',
  },
  {
    id: '2',
    title: 'Central Banks Continue Gold Accumulation in Q4',
    source: 'Bloomberg',
    url: '#',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    sentiment: 'bullish',
  },
  {
    id: '3',
    title: 'Technical Analysis: XAUUSD Approaches Key Resistance Level',
    source: 'TradingView',
    url: '#',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    sentiment: 'neutral',
  },
  {
    id: '4',
    title: 'Profit-Taking Pressure Expected After Recent Rally',
    source: 'FXStreet',
    url: '#',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    sentiment: 'bearish',
  },
]

export function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>(mockNews)
  const [isLoading, setIsLoading] = useState(false)

  const refreshNews = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setNews([...mockNews].sort(() => Math.random() - 0.5))
    setIsLoading(false)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getSentimentBorder = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'border-l-[var(--success)]'
      case 'bearish':
        return 'border-l-[var(--danger)]'
      default:
        return 'border-l-[var(--muted)]'
    }
  }

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'badge-bullish'
      case 'bearish':
        return 'badge-bearish'
      default:
        return 'badge-neutral'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
          Market Pulse News
        </h3>
        <button
          onClick={refreshNews}
          disabled={isLoading}
          className="text-[var(--gold)] hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-lg ${isLoading ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      {/* News List */}
      <div className="space-y-3">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] border-l-4 ${getSentimentBorder(item.sentiment)} hover:border-[var(--gold)]/50 hover:border-l-4 transition-all group`}
          >
            <h4 className="text-sm font-medium leading-snug mb-2 group-hover:text-[var(--gold)] transition-colors line-clamp-2">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[var(--muted)] uppercase tracking-tight">{item.source}</span>
              <span className="text-[var(--card-border)]">•</span>
              <span className="text-[var(--muted)]">{formatTime(item.publishedAt)}</span>
              {item.sentiment && (
                <span className={`ml-auto ${getSentimentBadge(item.sentiment)}`}>
                  {item.sentiment}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
