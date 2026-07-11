import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMatches } from '@/lib/football-data'
import { getTournament } from '@/lib/tournaments'
import { teamsMatch } from '@/lib/team-utils'
import type { Match } from '@/types'

// Dev-only — blocked in production
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const userId = new URL(request.url).searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json(
      { error: 'Pass ?user_id=YOUR_ID  (find it in Supabase → Authentication → Users)' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // 1. Pick the most recent finished match (World Cup — the only betting tournament)
  const finished = await getMatches(getTournament('world-cup')!, 'FINISHED')
  const match: Match | undefined = finished.at(-1)
  if (!match) {
    return NextResponse.json({ error: 'No finished matches found yet' }, { status: 404 })
  }

  const matchDate = match.utcDate.split('T')[0]

  // Save real balance so we can restore it after the test
  const { data: realProfile } = await supabase
    .from('user_profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single()
  const realBalance = (realProfile?.wallet_balance as number) ?? 0

  // Clean up any leftover test bets from a previous run
  await supabase.from('bets').delete().eq('user_id', userId).eq('odds_match_id', `test-${match.id}`)

  // 2. Insert test bets directly (admin bypasses RLS) — $10 stake, 2.00 odds, one per selection
  const STAKE = 10
  const ODDS = 2.0
  const selections = ['home', 'draw', 'away'] as const

  const { data: inserted, error: insertError } = await supabase
    .from('bets')
    .insert(
      selections.map((selection) => ({
        user_id: userId,
        odds_match_id: `test-${match.id}`,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        match_date: matchDate,
        commence_time: match.utcDate,
        selection,
        odds: ODDS,
        stake: STAKE,
        status: 'pending',
      }))
    )
    .select('id, selection')

  if (insertError) {
    return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 })
  }

  // Set wallet to $10,000 for the test (simulates a fresh account)
  await supabase
    .from('user_profiles')
    .update({ wallet_balance: 10000 - selections.length * STAKE })
    .eq('id', userId)

  // 4. Run settlement logic against each inserted bet
  const report: { selection: string; status?: string; payout?: number; settle_error?: string | null; error?: string }[] = []

  for (const betRow of inserted ?? []) {
    const fixture = finished.find((m: Match) => {
      return (
        m.utcDate.split('T')[0] === matchDate &&
        teamsMatch(m.homeTeam.name, match.homeTeam.name) &&
        teamsMatch(m.awayTeam.name, match.awayTeam.name)
      )
    })

    if (!fixture) {
      report.push({ selection: betRow.selection, error: 'Fixture not matched by team name' })
      continue
    }

    const winner = fixture.score.winner
    let status: 'won' | 'lost' | 'void'

    if (!winner) {
      status = 'void'
    } else if (
      (betRow.selection === 'home' && winner === 'HOME_TEAM') ||
      (betRow.selection === 'away' && winner === 'AWAY_TEAM') ||
      (betRow.selection === 'draw' && winner === 'DRAW')
    ) {
      status = 'won'
    } else {
      status = 'lost'
    }

    const payout = status === 'won' ? STAKE * ODDS : 0

    const { error: settleError } = await supabase.rpc('settle_bet', {
      p_bet_id: betRow.id,
      p_status: status,
      p_payout: payout,
    })

    report.push({
      selection: betRow.selection,
      status,
      payout,
      settle_error: settleError?.message ?? null,
    })
  }

  // 5. Read test balance to verify settlement, then restore real balance
  const { data: testProfile } = await supabase
    .from('user_profiles')
    .select('wallet_balance')
    .eq('id', userId)
    .single()

  const finalTestBalance = testProfile?.wallet_balance as number

  // Restore user's real balance and remove test bets
  await Promise.all([
    supabase.from('user_profiles').update({ wallet_balance: realBalance }).eq('id', userId),
    supabase.from('bets').delete().eq('user_id', userId).eq('odds_match_id', `test-${match.id}`),
  ])

  const actualWinner =
    match.score.winner === 'HOME_TEAM' ? 'home' :
    match.score.winner === 'AWAY_TEAM' ? 'away' : 'draw'

  const totalStaked = selections.length * STAKE
  const winningReturn = STAKE * ODDS
  const expectedBalance = 10000 - totalStaked + winningReturn

  return NextResponse.json({
    match: {
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      date: matchDate,
      score: `${match.score.fullTime.home} – ${match.score.fullTime.away}`,
      winner: actualWinner,
    },
    bets: report,
    wallet: {
      test_start: 10000,
      staked: totalStaked,
      winning_return: winningReturn,
      expected_after: expectedBalance,
      actual_after: finalTestBalance,
    },
    real_balance_restored: realBalance,
    pass: !report.some(r => r.error || r.settle_error) && finalTestBalance === expectedBalance,
  })
}
