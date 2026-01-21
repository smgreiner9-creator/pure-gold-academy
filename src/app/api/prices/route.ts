import { NextResponse } from 'next/server'

interface PriceData {
  symbol: string
  price: number
  change: number
  changePercent: number
  lastUpdated: string
}

// Cache prices for 15 minutes to conserve API calls (apilayer limit: 100/month)
let priceCache: { data: Record<string, PriceData>; timestamp: number } | null = null
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Store previous prices to calculate change
const previousPrices: Record<string, number> = {}

// Primary: Frankfurter API (free, unlimited)
async function fetchFromFrankfurter(): Promise<Record<string, PriceData> | null> {
  try {
    const forexRes = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CAD,CHF,AUD,NZD',
      { cache: 'no-store' }
    )

    if (!forexRes.ok) return null

    const forexData = await forexRes.json()
    const rates = forexData.rates || {}
    const prices: Record<string, PriceData> = {}
    const now = new Date().toISOString()

    // Helper to create price entry with change calculation
    const createPriceEntry = (symbol: string, price: number, decimals: number): PriceData => {
      const prevPrice = previousPrices[symbol]
      const change = prevPrice ? price - prevPrice : 0
      const changePercent = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0

      return {
        symbol,
        price: parseFloat(price.toFixed(decimals)),
        change: parseFloat(change.toFixed(decimals)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        lastUpdated: now,
      }
    }

    // XXX/USD pairs (inverted)
    if (rates.EUR) prices['EURUSD'] = createPriceEntry('EURUSD', 1 / rates.EUR, 5)
    if (rates.GBP) prices['GBPUSD'] = createPriceEntry('GBPUSD', 1 / rates.GBP, 5)
    if (rates.AUD) prices['AUDUSD'] = createPriceEntry('AUDUSD', 1 / rates.AUD, 5)
    if (rates.NZD) prices['NZDUSD'] = createPriceEntry('NZDUSD', 1 / rates.NZD, 5)

    // USD/XXX pairs (direct)
    if (rates.JPY) prices['USDJPY'] = createPriceEntry('USDJPY', rates.JPY, 3)
    if (rates.CAD) prices['USDCAD'] = createPriceEntry('USDCAD', rates.CAD, 5)
    if (rates.CHF) prices['USDCHF'] = createPriceEntry('USDCHF', rates.CHF, 5)

    // Update previous prices for next calculation
    Object.entries(prices).forEach(([symbol, data]) => {
      previousPrices[symbol] = data.price
    })

    return prices
  } catch (error) {
    console.error('Frankfurter API error:', error)
    return null
  }
}

// Fallback: APILayer (limited to 100 calls/month)
async function fetchFromApiLayer(): Promise<Record<string, PriceData> | null> {
  const apiKey = process.env.APILAYER_FOREX_KEY
  if (!apiKey) {
    console.warn('APILAYER_FOREX_KEY not configured')
    return null
  }

  try {
    const res = await fetch(
      `https://apilayer.net/api/live?access_key=${apiKey}&currencies=EUR,GBP,JPY,CAD,CHF,AUD,NZD&source=USD&format=1`,
      { cache: 'no-store' }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!data.success || !data.quotes) {
      console.error('APILayer error:', data.error)
      return null
    }

    const quotes = data.quotes
    const prices: Record<string, PriceData> = {}
    const now = new Date().toISOString()

    const createPriceEntry = (symbol: string, price: number, decimals: number): PriceData => {
      const prevPrice = previousPrices[symbol]
      const change = prevPrice ? price - prevPrice : 0
      const changePercent = prevPrice ? ((price - prevPrice) / prevPrice) * 100 : 0

      return {
        symbol,
        price: parseFloat(price.toFixed(decimals)),
        change: parseFloat(change.toFixed(decimals)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        lastUpdated: now,
      }
    }

    // APILayer returns USDEUR, USDGBP etc. - need to invert for EURUSD, GBPUSD
    if (quotes.USDEUR) prices['EURUSD'] = createPriceEntry('EURUSD', 1 / quotes.USDEUR, 5)
    if (quotes.USDGBP) prices['GBPUSD'] = createPriceEntry('GBPUSD', 1 / quotes.USDGBP, 5)
    if (quotes.USDAUD) prices['AUDUSD'] = createPriceEntry('AUDUSD', 1 / quotes.USDAUD, 5)
    if (quotes.USDNZD) prices['NZDUSD'] = createPriceEntry('NZDUSD', 1 / quotes.USDNZD, 5)
    if (quotes.USDJPY) prices['USDJPY'] = createPriceEntry('USDJPY', quotes.USDJPY, 3)
    if (quotes.USDCAD) prices['USDCAD'] = createPriceEntry('USDCAD', quotes.USDCAD, 5)
    if (quotes.USDCHF) prices['USDCHF'] = createPriceEntry('USDCHF', quotes.USDCHF, 5)

    // Update previous prices
    Object.entries(prices).forEach(([symbol, data]) => {
      previousPrices[symbol] = data.price
    })

    console.log('Used APILayer fallback for forex prices')
    return prices
  } catch (error) {
    console.error('APILayer error:', error)
    return null
  }
}

async function fetchForexPrices(): Promise<Record<string, PriceData>> {
  // Try Frankfurter first (free, unlimited)
  let prices = await fetchFromFrankfurter()

  // If failed and we have API key, try APILayer as fallback
  if (!prices || Object.keys(prices).length === 0) {
    prices = await fetchFromApiLayer()
  }

  return prices || {}
}

async function fetchCryptoPrices(): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {}

  try {
    // Fetch Bitcoin from CoinGecko (free, no API key needed)
    const cryptoRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 30 } }
    )

    if (cryptoRes.ok) {
      const cryptoData = await cryptoRes.json()

      if (cryptoData.bitcoin) {
        prices['BTCUSD'] = {
          symbol: 'BTCUSD',
          price: cryptoData.bitcoin.usd,
          change: 0,
          changePercent: cryptoData.bitcoin.usd_24h_change || 0,
          lastUpdated: new Date().toISOString(),
        }
      }
    }
  } catch (error) {
    console.error('Error fetching crypto prices:', error)
  }

  return prices
}

async function fetchGoldPrice(): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {}

  try {
    // Try to fetch gold price from metals.live (free)
    const goldRes = await fetch('https://api.metals.live/v1/spot/gold', {
      next: { revalidate: 30 },
    })

    if (goldRes.ok) {
      const goldData = await goldRes.json()
      if (Array.isArray(goldData) && goldData.length > 0) {
        prices['XAUUSD'] = {
          symbol: 'XAUUSD',
          price: goldData[0].price || 2650,
          change: 0,
          changePercent: 0,
          lastUpdated: new Date().toISOString(),
        }
      }
    }
  } catch (error) {
    console.error('Error fetching gold price:', error)
    // Fallback - try alternative API or use reasonable default
  }

  // If gold fetch failed, try alternative
  if (!prices['XAUUSD']) {
    try {
      // Alternative: Use frankfurter.app for XAU if available
      const altRes = await fetch(
        'https://api.frankfurter.app/latest?from=XAU&to=USD',
        { next: { revalidate: 30 } }
      )
      if (altRes.ok) {
        const altData = await altRes.json()
        if (altData.rates?.USD) {
          prices['XAUUSD'] = {
            symbol: 'XAUUSD',
            price: parseFloat(altData.rates.USD.toFixed(2)),
            change: 0,
            changePercent: 0,
            lastUpdated: new Date().toISOString(),
          }
        }
      }
    } catch {
      // Use fallback price if all APIs fail
      prices['XAUUSD'] = {
        symbol: 'XAUUSD',
        price: 2650.00,
        change: 0,
        changePercent: 0,
        lastUpdated: new Date().toISOString(),
      }
    }
  }

  return prices
}

export async function GET() {
  try {
    // Check cache first
    if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        prices: priceCache.data,
        cached: true,
        timestamp: new Date(priceCache.timestamp).toISOString(),
      })
    }

    // Fetch all prices in parallel
    const [forexPrices, cryptoPrices, goldPrices] = await Promise.all([
      fetchForexPrices(),
      fetchCryptoPrices(),
      fetchGoldPrice(),
    ])

    // Merge all prices
    const allPrices: Record<string, PriceData> = {
      ...forexPrices,
      ...cryptoPrices,
      ...goldPrices,
    }

    // Update cache
    priceCache = {
      data: allPrices,
      timestamp: Date.now(),
    }

    return NextResponse.json({
      prices: allPrices,
      cached: false,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in prices API:', error)

    // Return cached data if available, even if stale
    if (priceCache) {
      return NextResponse.json({
        prices: priceCache.data,
        cached: true,
        stale: true,
        timestamp: new Date(priceCache.timestamp).toISOString(),
      })
    }

    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}
