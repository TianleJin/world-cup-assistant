import type { Match, Standing } from '@/types'

const BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'
const SEASON = '2026'

function headers() {
  return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN! }
}

export async function getMatches(statusFilter?: string): Promise<Match[]> {
  const params = new URLSearchParams({ season: SEASON })
  if (statusFilter) params.set('status', statusFilter)

  const res = await fetch(`${BASE}/competitions/${COMPETITION}/matches?${params}`, {
    headers: headers(),
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    console.error('football-data.org matches error:', res.status, await res.text())
    return []
  }

  const data = await res.json()
  return data.matches ?? []
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const res = await fetch(`${BASE}/matches/${matchId}`, {
    headers: headers(),
    next: { revalidate: 60 },
  })

  if (!res.ok) return null
  return res.json()
}

export async function getStandings(): Promise<Standing[]> {
  const res = await fetch(
    `${BASE}/competitions/${COMPETITION}/standings?season=${SEASON}`,
    { headers: headers(), next: { revalidate: 300 } }
  )

  if (!res.ok) {
    console.error('football-data.org standings error:', res.status)
    return []
  }

  const data = await res.json()
  return data.standings ?? []
}

export async function getScorers() {
  const res = await fetch(
    `${BASE}/competitions/${COMPETITION}/scorers?season=${SEASON}&limit=20`,
    { headers: headers(), next: { revalidate: 300 } }
  )

  if (!res.ok) return { scorers: [] }
  return res.json()
}
