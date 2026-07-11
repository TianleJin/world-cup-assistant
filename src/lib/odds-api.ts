import type { OddsRow } from '@/types'
import type { Tournament } from '@/lib/tournaments'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE = 'https://api.the-odds-api.com/v4'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours — see quota note below

// The Odds API bills per (market × region) on every cache-miss refresh. With two
// betting tournaments sharing one free-tier key (500 req/month), h2h+totals at a
// 6h TTL would cost ~480/month — almost no headroom. Requesting h2h only (no
// totals/over-under market) at a 12h TTL keeps both tournaments comfortably under
// quota. over_odds/under_odds stay in the schema/types but are always null now.
export async function getOdds(t: Tournament): Promise<OddsRow[]> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - CACHE_TTL_MS).toISOString()

  // Return cached odds if still fresh
  const { data: cached } = await supabase
    .from('odds_cache')
    .select('*')
    .eq('competition', t.slug)
    .gte('fetched_at', since)
    .order('commence_time', { ascending: true })

  if (cached && cached.length > 0) return cached as OddsRow[]

  // Fetch fresh odds from The Odds API
  const sport = t.oddsSportKey ?? 'soccer_fifa_world_cup'
  const params = new URLSearchParams({
    apiKey: process.env.ODDS_API_KEY!,
    regions: 'au',
    markets: 'h2h',
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

    return {
      competition: t.slug,
      match_id: e.id,
      home_team: e.home_team,
      away_team: e.away_team,
      commence_time: e.commence_time,
      home_odds: h2hOutcomes.find((o) => o.name === e.home_team)?.price ?? null,
      away_odds: h2hOutcomes.find((o) => o.name === e.away_team)?.price ?? null,
      draw_odds: h2hOutcomes.find((o) => o.name === 'Draw')?.price ?? null,
      over_odds: null,
      under_odds: null,
      bookmaker: h2hBookmaker?.key ?? 'sportsbet',
      fetched_at: now,
    }
  })

  if (rows.length > 0) {
    await supabase
      .from('odds_cache')
      .upsert(rows, { onConflict: 'competition,match_id,bookmaker' })
  }

  return rows
}

export async function getOddsByMatchId(t: Tournament, matchId: string): Promise<OddsRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('odds_cache')
    .select('*')
    .eq('competition', t.slug)
    .eq('match_id', matchId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  return (data as OddsRow) ?? null
}
