import { NextResponse } from 'next/server'

interface PriceData {
  symbol: string
  price: number
  change: number
  changePercent: number
  lastUpdated: string
}

// Cache prices for 30 seconds to avoid rate limits
let priceCache: { data: Record<string, PriceData>; timestamp: number } | null = null
const CACHE_TTL = 30 * 1000 // 30 seconds

async function fetchForexPrices(): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {}

  try {
    // Fetch forex rates from Frankfurter API (free, no API key needed)
    const forexRes = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY',
      { next: { revalidate: 30 } }
    )

    if (forexRes.ok) {
      const forexData = await forexRes.json()
      const rates = forexData.rates || {}

      // EUR/USD (inverted since we got USD base)
      if (rates.EUR) {
        const eurUsd = 1 / rates.EUR
        prices['EURUSD'] = {
          symbol: 'EURUSD',
          price: parseFloat(eurUsd.toFixed(5)),
          change: 0,
          changePercent: 0,
          lastUpdated: new Date().toISOString(),
        }
      }

      // GBP/USD
      if (rates.GBP) {
        const gbpUsd = 1 / rates.GBP
        prices['GBPUSD'] = {
          symbol: 'GBPUSD',
          price: parseFloat(gbpUsd.toFixed(5)),
          change: 0,
          changePercent: 0,
          lastUpdated: new Date().toISOString(),
        }
      }

      // USD/JPY
      if (rates.JPY) {
        prices['USDJPY'] = {
          symbol: 'USDJPY',
          price: parseFloat(rates.JPY.toFixed(3)),
          change: 0,
          changePercent: 0,
          lastUpdated: new Date().toISOString(),
        }
      }
    }
  } catch (error) {
    console.error('Error fetching forex prices:', error)
  }

  return prices
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
