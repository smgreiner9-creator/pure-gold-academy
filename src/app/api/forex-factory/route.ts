import { NextResponse } from 'next/server'

interface FFEvent {
  title: string
  country: string
  date: string
  time: string
  impact: string
  forecast: string
  previous: string
}

export async function GET() {
  try {
    // Forex Factory calendar XML feed (via Fair Economy mirror)
    const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Forex Factory data')
    }

    const xmlText = await response.text()

    // Parse XML manually (handles CDATA tags)
    const events: FFEvent[] = []
    const eventMatches = xmlText.match(/<event>([\s\S]*?)<\/event>/g)

    if (eventMatches) {
      for (const eventXml of eventMatches) {
        const getTagValue = (tag: string): string => {
          // Match tag content, handling both CDATA and regular content
          const match = eventXml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`))
          if (match) {
            // Clean up CDATA wrapper if present
            let value = match[1].trim()
            // Remove any remaining CDATA markers
            value = value.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim()
            return value
          }
          return ''
        }

        const event: FFEvent = {
          title: getTagValue('title'),
          country: getTagValue('country'),
          date: getTagValue('date'),
          time: getTagValue('time'),
          impact: getTagValue('impact'),
          forecast: getTagValue('forecast'),
          previous: getTagValue('previous'),
        }

        // Only include events with valid data
        if (event.title && event.country) {
          events.push(event)
        }
      }
    }

    // Filter to show today's and upcoming events, sorted by date/time
    const now = new Date()

    // Sort events by date and time
    const sortedEvents = events
      .filter(e => {
        // Parse the date (format: MM-DD-YYYY)
        if (!e.date) return false
        const [month, day, year] = e.date.split('-').map(Number)
        const eventDate = new Date(year, month - 1, day)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return eventDate >= today
      })
      .sort((a, b) => {
        // Sort by date first
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        // Then by time
        return (a.time || '').localeCompare(b.time || '')
      })
      .slice(0, 20) // Limit to 20 events

    return NextResponse.json({
      events: sortedEvents,
      count: sortedEvents.length,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching Forex Factory data:', error)

    // Return empty array on error
    return NextResponse.json({
      events: [],
      error: 'Failed to fetch calendar data',
      lastUpdated: new Date().toISOString()
    }, { status: 500 })
  }
}
