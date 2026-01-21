'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui'
import { Link, Youtube, BarChart3, AlertCircle, Check } from 'lucide-react'
import { parseEmbedUrl, detectContentType, isValidUrl } from '@/lib/embedUtils'
import { YouTubeEmbed } from './YouTubeEmbed'
import { TradingViewEmbed } from './TradingViewEmbed'

interface EmbedPickerProps {
  value: string
  onChange: (url: string, type: 'youtube' | 'tradingview' | 'video' | 'image' | 'pdf' | 'text') => void
  placeholder?: string
  showPreview?: boolean
}

export function EmbedPicker({
  value,
  onChange,
  placeholder = 'Paste a YouTube or TradingView URL...',
  showPreview = true
}: EmbedPickerProps) {
  const [url, setUrl] = useState(value)
  const [detectedType, setDetectedType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUrl(value)
  }, [value])

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    setError(null)
    setDetectedType(null)

    if (!newUrl.trim()) {
      return
    }

    if (!isValidUrl(newUrl)) {
      setError('Please enter a valid URL')
      return
    }

    const type = detectContentType(newUrl)
    setDetectedType(type)

    if (type !== 'unknown') {
      // Map to content_type for database
      const dbType = type === 'youtube' || type === 'tradingview' ? type : type
      onChange(newUrl, dbType as 'youtube' | 'tradingview' | 'video' | 'image' | 'pdf' | 'text')
    }
  }

  const embedInfo = url ? parseEmbedUrl(url) : null

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          <Link size={18} />
        </div>
        <Input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {/* Detection indicator */}
      {detectedType && detectedType !== 'unknown' && (
        <div className="flex items-center gap-2 text-sm">
          {detectedType === 'youtube' && (
            <>
              <Youtube size={16} className="text-red-500" />
              <span className="text-[var(--success)]">YouTube video detected</span>
              <Check size={14} className="text-[var(--success)]" />
            </>
          )}
          {detectedType === 'tradingview' && (
            <>
              <BarChart3 size={16} className="text-[var(--gold)]" />
              <span className="text-[var(--success)]">TradingView chart detected</span>
              <Check size={14} className="text-[var(--success)]" />
            </>
          )}
          {detectedType === 'video' && (
            <>
              <span className="text-[var(--success)]">Video file detected</span>
              <Check size={14} className="text-[var(--success)]" />
            </>
          )}
          {detectedType === 'image' && (
            <>
              <span className="text-[var(--success)]">Image file detected</span>
              <Check size={14} className="text-[var(--success)]" />
            </>
          )}
          {detectedType === 'pdf' && (
            <>
              <span className="text-[var(--success)]">PDF document detected</span>
              <Check size={14} className="text-[var(--success)]" />
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-[var(--danger)]">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Preview */}
      {showPreview && embedInfo && embedInfo.type !== 'unknown' && (
        <div className="border border-[var(--card-border)] rounded-lg overflow-hidden">
          <div className="p-2 bg-[var(--card-bg)] border-b border-[var(--card-border)]">
            <p className="text-xs text-[var(--muted)]">Preview</p>
          </div>
          <div className="p-3">
            {embedInfo.type === 'youtube' && (
              <YouTubeEmbed url={url} />
            )}
            {embedInfo.type === 'tradingview' && (
              <TradingViewEmbed url={url} height={300} />
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-[var(--muted)] space-y-1">
        <p>Supported URLs:</p>
        <ul className="list-disc list-inside pl-2 space-y-0.5">
          <li>YouTube: youtube.com/watch?v=..., youtu.be/...</li>
          <li>TradingView: tradingview.com/chart/..., tradingview.com/x/...</li>
        </ul>
      </div>
    </div>
  )
}
