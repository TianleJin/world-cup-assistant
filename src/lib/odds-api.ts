import type { OddsRow } from '@/types'
import type { Tournament } from '@/lib/tournaments'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE = 'https://api.the-odds-api.com/v4'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

// NOTE: odds_cache has no competition column, so this cache is global. That is
// only safe while a single tournament (the World Cup) has betting enabled. Before
// enabling betting on a second tournament, add a competition column to odds_cache
// (and its conflict key) and filter by it here. See the plan's "Deferred" section.
export async function getOdds(t: Tournament): Promise<OddsRow[]> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - CACHE_TTL_MS).toISOString()

  // Return cached odds if still fresh
  const { data: cached } = await supabase
    .from('odds_cache')
    .select('*')
    .gte('fetched_at', since)
    .order('commence_time', { ascending: true })

  if (cached && cached.length > 0) return cached as OddsRow[]

  // Fetch fresh odds from The Odds API
  const sport = t.oddsSportKey ?? 'soccer_fifa_world_cup'
  const params = new URLSearchParams({
    apiKey: process.env.ODDS_API_KEY!,
    regions: 'au',
    markets: 'h2h,totals',
    dateFormat: 'iso',
  })

  const res = await fetch(`${BASE}/sports/${sport}/odds?${params}`)
  if (!res.ok) {
    console.error('The Odds API error:', res.status, await res.text())
    return cached ?? []
  }

  const events = (await res.json()) as { id: string; home_team: string; away_team: string; commence_time: string; bookmakers: { key: string; markets: { key: string; outcomes: { name: string; price: number }[] }[] }[] }[]
  const now = new Date().toISOString()

  const rows: OddsRow[] = events.map((e) => {
    const bookmakers: { key: string; markets: { key: string; outcomes: { name: string; price: number }[] }[] }[] = e.bookmakers ?? []
    // Prefer Sportsbet for h2h, fall back to first available
    const h2hBookmaker = bookmakers.find((b) => b.key === 'sportsbet') ?? bookmakers[0]
    const h2h = h2hBookmaker?.markets?.find((m) => m.key === 'h2h')
    const h2hOutcomes = h2h?.outcomes ?? []
    // Use any bookmaker that has totals (Sportsbet often doesn't offer this market)
    const totalsBookmaker = bookmakers.find((b) => b.markets?.some((m) => m.key === 'totals'))
    const totals = totalsBookmaker?.markets?.find((m) => m.key === 'totals')
    const totalsOutcomes = totals?.outcomes ?? []

    return {
      match_id: e.id,
      home_team: e.home_team,
      away_team: e.away_team,
      commence_time: e.commence_time,
      home_odds: h2hOutcomes.find((o) => o.name === e.home_team)?.price ?? null,
      away_odds: h2hOutcomes.find((o) => o.name === e.away_team)?.price ?? null,
      draw_odds: h2hOutcomes.find((o) => o.name === 'Draw')?.price ?? null,
      over_odds: totalsOutcomes.find((o) => o.name === 'Over')?.price ?? null,
      under_odds: totalsOutcomes.find((o) => o.name === 'Under')?.price ?? null,
      bookmaker: h2hBookmaker?.key ?? 'sportsbet',
      fetched_at: now,
    }
  })

  if (rows.length > 0) {
    await supabase
      .from('odds_cache')
      .upsert(rows, { onConflict: 'match_id,bookmaker' })
  }

  return rows
}

export async function getOddsByMatchId(matchId: string): Promise<OddsRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('odds_cache')
    .select('*')
    .eq('match_id', matchId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  return (data as OddsRow) ?? null
}
