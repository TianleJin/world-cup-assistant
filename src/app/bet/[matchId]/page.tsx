import { getOddsByMatchId } from '@/lib/odds-api'
import { createClient } from '@/lib/supabase/server'
import BetForm from '@/components/bet-form'
import LocalTime from '@/components/local-time'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ matchId: string }>
  searchParams: Promise<{ selection?: string }>
}

export default async function BetPage({ params, searchParams }: Props) {
  const { matchId } = await params
  const { selection } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirected=1')

  const [odds, profileResult] = await Promise.all([
    getOddsByMatchId(matchId),
    supabase.from('user_profiles').select('wallet_balance').eq('id', user.id).single(),
  ])

  const balance = (profileResult.data?.wallet_balance as number) ?? 0

  if (!odds) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-slate-400">Odds not found for this match.</p>
        <p className="text-sm text-slate-500">
          The odds may have expired or the match is no longer available.
        </p>
        <Link href="/odds" className="text-green-500 hover:text-green-400 text-sm">
          ← Back to odds
        </Link>
      </div>
    )
  }

  const kickoff = new Date(odds.commence_time)
  const isExpired = kickoff < new Date()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link href="/odds" className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1">
        ← Back to odds
      </Link>

      {/* Match header */}
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
          <BetForm odds={odds} balance={balance} preselection={selection} />
        </div>
      )}
    </div>
  )
}
