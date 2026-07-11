import { getOddsByMatchId } from '@/lib/odds-api'
import { getTournament } from '@/lib/tournaments'
import { createClient } from '@/lib/supabase/server'
import { cancelBetAction } from '@/app/actions'
import BetForm from '@/components/bet-form'
import LocalTime from '@/components/local-time'
import SuccessBanner from '@/components/success-banner'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import type { Bet } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ tournament: string; matchId: string }>
  searchParams: Promise<{ selection?: string; success?: string }>
}

export default async function BetPage({ params, searchParams }: Props) {
  const { tournament, matchId } = await params
  const t = getTournament(tournament)
  if (!t || !t.betting) notFound()

  const base = `/${t.slug}`
  const { selection, success } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirected=1')

  const [odds, profileResult, betsResult] = await Promise.all([
    getOddsByMatchId(t, matchId),
    supabase.from('user_profiles').select('wallet_balance').eq('id', user.id).single(),
    supabase.from('bets').select('*').eq('user_id', user.id).eq('competition', t.slug).eq('odds_match_id', matchId).neq('status', 'void').order('placed_at', { ascending: false }),
  ])

  const balance = (profileResult.data?.wallet_balance as number) ?? 0
  const existingBets: Bet[] = betsResult.data ?? []

  if (!odds) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-slate-400">Odds not found for this match.</p>
        <p className="text-sm text-slate-500">
          The odds may have expired or the match is no longer available.
        </p>
        <Link href={`${base}/odds`} className="text-amber-500 hover:text-amber-400 text-sm">
          ← Back to odds
        </Link>
      </div>
    )
  }

  const kickoff = new Date(odds.commence_time)
  const isExpired = kickoff < new Date()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href={`${base}/odds`} className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1">
        ← Back to odds
      </Link>

      {success && <SuccessBanner type={success} />}

      {/* Match header — full width */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="text-xs text-slate-400 mb-3">
          <LocalTime iso={odds.commence_time} options={{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }} />
        </div>
        <div className="text-xl font-bold text-white">
          {odds.home_team} <span className="text-slate-500 font-normal">vs</span> {odds.away_team}
        </div>
        <div className="text-xs text-slate-400 mt-1 capitalize">{odds.bookmaker}</div>
      </div>

      {isExpired ? (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-300 rounded-xl p-4 text-sm">
          This match has already kicked off. Betting is closed.
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Place a Bet</h2>
          <BetForm odds={odds} balance={balance} preselection={selection} tournamentSlug={t.slug} />
        </div>
      )}

      {/* Existing bets on this match */}
      {existingBets.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold">Your bets on this match</h2>
          {existingBets.map((b) => {
            const selectionLabel =
              b.selection === 'home' ? odds.home_team
              : b.selection === 'away' ? odds.away_team
              : b.selection === 'draw' ? 'Draw'
              : b.selection === 'over' ? 'Over 2.5'
              : 'Under 2.5'
            const statusClass = {
              pending: 'text-amber-300 bg-amber-900/30 border-amber-800',
              won: 'text-green-300 bg-green-900/50 border-green-800',
              lost: 'text-red-300 bg-red-900/40 border-red-900',
              void: 'text-slate-400 bg-slate-700 border-slate-600',
            }[b.status]
            const now = new Date()
            const canCancel =
              b.status === 'pending' &&
              (b.commence_time ? new Date(b.commence_time) > now : b.match_date >= now.toISOString().split('T')[0])
            return (
              <div key={b.id} className={`border rounded-xl px-4 py-3 space-y-2 ${statusClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{selectionLabel}</div>
                  <span className="text-xs font-semibold uppercase">{b.status}</span>
                </div>
                <div className="text-xs opacity-75">
                  ${b.stake.toFixed(2)} @ {b.odds.toFixed(2)} · returns ${(b.stake * b.odds).toFixed(2)}
                </div>
                {canCancel && (
                  <form action={cancelBetAction}>
                    <input type="hidden" name="bet_id" value={b.id} />
                    <input type="hidden" name="redirect_to" value={`${base}/bet/${matchId}`} />
                    <button
                      type="submit"
                      className="w-full text-xs text-slate-300 hover:text-white border border-slate-500 hover:border-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      Cancel bet
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
