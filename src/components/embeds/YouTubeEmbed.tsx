'use client'

import { useState } from 'react'
import { getYouTubeEmbedUrl, getYouTubeThumbnail, extractYouTubeId } from '@/lib/embedUtils'

interface YouTubeEmbedProps {
  url: string
  title?: string
  autoplay?: boolean
  className?: string
}

export function YouTubeEmbed({ url, title, autoplay = false, className = '' }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay)
  const videoId = extractYouTubeId(url)

  if (!videoId) {
    return (
      <div className={`glass-surface rounded-lg p-4 text-center ${className}`}>
        <p className="text-[var(--muted)]">Invalid YouTube URL</p>
      </div>
    )
  }

  const embedUrl = getYouTubeEmbedUrl(videoId) + (autoplay ? '&autoplay=1' : '')
  const thumbnailUrl = getYouTubeThumbnail(videoId, 'high')

  if (!isPlaying) {
    return (
      <div
        className={`relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer group ${className}`}
        onClick={() => setIsPlaying(true)}
      >
        {/* Thumbnail */}
        <img
          src={thumbnailUrl}
          alt={title || 'YouTube video thumbnail'}
          className="w-full h-full object-cover"
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl text-white ml-1">play_arrow</span>
          </div>
        </div>

        {/* Title */}
        {title && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-sm font-medium truncate">{title}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`aspect-video rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
