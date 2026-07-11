import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMatches } from '@/lib/football-data'
import { getTournament } from '@/lib/tournaments'
import { teamsMatch } from '@/lib/team-utils'
import type { Match, Bet } from '@/types'

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get pending bets where the match date is today or earlier
  const today = new Date().toISOString().split('T')[0]
  const { data: pendingBets, error: betsError } = await supabase
    .from('bets')
    .select('*')
    .eq('status', 'pending')
    .lte('match_date', today)

  if (betsError) {
    return NextResponse.json({ error: betsError.message }, { status: 500 })
  }

  if (!pendingBets || pendingBets.length === 0) {
    return NextResponse.json({ settled: 0, message: 'No pending bets to settle' })
  }

  // Fetch recently finished matches. Only the World Cup has betting enabled today,
  // so all bets settle against WC results. When a second tournament gets betting,
  // tag bets with their competition and settle per-competition (see plan "Deferred").
  const worldCup = getTournament('world-cup')!
  const finishedMatches = await getMatches(worldCup, 'FINISHED')
  let settled = 0
  const errors: string[] = []

  for (const bet of pendingBets as Bet[]) {
    const match = finishedMatches.find((m: Match) => {
      const mDate = m.utcDate.split('T')[0]
      return (
        mDate === bet.match_date &&
        teamsMatch(m.homeTeam.name, bet.home_team) &&
        teamsMatch(m.awayTeam.name, bet.away_team)
      )
    })

    if (!match) {
      // Distinguish "result not in yet" from "should have matched but didn't" —
      // the latter usually means a team-name mismatch between data sources (see team-utils.ts)
      const staleDays = (Date.now() - new Date(bet.match_date).getTime()) / (1000 * 60 * 60 * 24)
      if (staleDays > 2) {
        console.warn(
          `[settle] Bet ${bet.id} (${bet.home_team} vs ${bet.away_team} on ${bet.match_date}) ` +
          `is ${staleDays.toFixed(1)} days old with no matching finished match — possible team-name mismatch.`
        )
      }
      continue
    }

    const winner = match.score.winner
    // For PSO matches fullTime includes penalty goals; subtract them to get real goals
    const isPso = match.score.duration === 'PENALTY_SHOOTOUT'
    const penHome = isPso ? (match.score.penalties?.home ?? 0) : 0
    const penAway = isPso ? (match.score.penalties?.away ?? 0) : 0
    const homeGoals = match.score.fullTime.home != null ? match.score.fullTime.home - penHome : null
    const awayGoals = match.score.fullTime.away != null ? match.score.fullTime.away - penAway : null
    let status: 'won' | 'lost' | 'void'

    if (bet.selection === 'over' || bet.selection === 'under') {
      if (homeGoals === null || awayGoals === null) continue
      const totalGoals = homeGoals + awayGoals
      status = (bet.selection === 'over' && totalGoals > 2.5) ||
               (bet.selection === 'under' && totalGoals < 2.5) ? 'won' : 'lost'
    } else {
      if (winner === null) continue
      status =
        (bet.selection === 'home' && winner === 'HOME_TEAM') ||
        (bet.selection === 'away' && winner === 'AWAY_TEAM') ||
        (bet.selection === 'draw' && winner === 'DRAW')
          ? 'won'
          : 'lost'
    }

    const payout = status === 'won' ? bet.stake * bet.odds : 0

    const { error: settleError } = await supabase.rpc('settle_bet', {
      p_bet_id: bet.id,
      p_status: status,
      p_payout: payout,
    })

    if (settleError) {
      errors.push(`Bet ${bet.id}: ${settleError.message}`)
    } else {
      settled++
    }
  }

  return NextResponse.json({
    settled,
    checked: pendingBets.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
