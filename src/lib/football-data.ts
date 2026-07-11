import type { Match, Standing } from '@/types'
import type { Tournament } from '@/lib/tournaments'

const BASE = 'https://api.football-data.org/v4'

function headers() {
  return { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_TOKEN! }
}

export async function getMatches(t: Tournament, statusFilter?: string): Promise<Match[]> {
  const params = new URLSearchParams({ season: t.season })
  if (statusFilter) params.set('status', statusFilter)

  const res = await fetch(`${BASE}/competitions/${t.competitionCode}/matches?${params}`, {
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

export async function getStandings(t: Tournament): Promise<Standing[]> {
  const res = await fetch(
    `${BASE}/competitions/${t.competitionCode}/standings?season=${t.season}`,
    { headers: headers(), next: { revalidate: 300 } }
  )

  if (!res.ok) {
    console.error('football-data.org standings error:', res.status)
    return []
  }

  const data = await res.json()
  return data.standings ?? []
}

export async function getScorers(t: Tournament) {
  const res = await fetch(
    `${BASE}/competitions/${t.competitionCode}/scorers?season=${t.season}&limit=20`,
    { headers: headers(), next: { revalidate: 300 } }
  )

  if (!res.ok) return { scorers: [] }
  return res.json()
}
