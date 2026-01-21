// Embed utilities for parsing YouTube and TradingView URLs

export interface EmbedInfo {
  type: 'youtube' | 'tradingview' | 'unknown'
  embedUrl: string | null
  videoId?: string
  chartSymbol?: string
  originalUrl: string
}

// YouTube URL patterns
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]

// TradingView URL patterns
const TRADINGVIEW_PATTERNS = [
  /tradingview\.com\/chart\/([^\/\?]+)/,
  /tradingview\.com\/x\/([^\/\?]+)/,
  /s\.tradingview\.com\/([^\/\?]+)/,
]

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

/**
 * Generate a YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}

/**
 * Generate a YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

/**
 * Check if URL is a TradingView URL
 */
export function isTradingViewUrl(url: string): boolean {
  return url.includes('tradingview.com')
}

/**
 * Extract TradingView chart ID/symbol from URL
 */
export function extractTradingViewInfo(url: string): { chartId?: string; symbol?: string } | null {
  // Try to extract chart ID
  for (const pattern of TRADINGVIEW_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return { chartId: match[1] }
    }
  }

  // Try to extract symbol from URL params
  const urlObj = new URL(url)
  const symbol = urlObj.searchParams.get('symbol')
  if (symbol) {
    return { symbol }
  }

  return null
}

/**
 * Parse any URL and determine its embed type and details
 */
export function parseEmbedUrl(url: string): EmbedInfo {
  if (!url || typeof url !== 'string') {
    return { type: 'unknown', embedUrl: null, originalUrl: url }
  }

  // Try YouTube
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return {
      type: 'youtube',
      embedUrl: getYouTubeEmbedUrl(youtubeId),
      videoId: youtubeId,
      originalUrl: url,
    }
  }

  // Try TradingView
  if (isTradingViewUrl(url)) {
    const tvInfo = extractTradingViewInfo(url)
    return {
      type: 'tradingview',
      embedUrl: url, // TradingView embeds use the original URL
      chartSymbol: tvInfo?.symbol || tvInfo?.chartId,
      originalUrl: url,
    }
  }

  return {
    type: 'unknown',
    embedUrl: null,
    originalUrl: url,
  }
}

/**
 * Auto-detect content type from URL
 */
export function detectContentType(url: string): 'youtube' | 'tradingview' | 'video' | 'image' | 'pdf' | 'unknown' {
  if (!url) return 'unknown'

  const lowerUrl = url.toLowerCase()

  // YouTube
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube'
  }

  // TradingView
  if (lowerUrl.includes('tradingview.com')) {
    return 'tradingview'
  }

  // Video files
  if (lowerUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/)) {
    return 'video'
  }

  // Images
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/)) {
    return 'image'
  }

  // PDFs
  if (lowerUrl.match(/\.pdf(\?.*)?$/)) {
    return 'pdf'
  }

  return 'unknown'
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize URL for embedding (basic security check)
 */
export function sanitizeEmbedUrl(url: string): string | null {
  if (!isValidUrl(url)) return null

  try {
    const urlObj = new URL(url)

    // Only allow https (or http for localhost in development)
    if (!['https:', 'http:'].includes(urlObj.protocol)) {
      return null
    }

    // Whitelist allowed domains for embeds
    const allowedDomains = [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'tradingview.com',
      'www.tradingview.com',
      's.tradingview.com',
    ]

    const isAllowed = allowedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    )

    if (!isAllowed) {
      return null
    }

    return url
  } catch {
    return null
  }
}
