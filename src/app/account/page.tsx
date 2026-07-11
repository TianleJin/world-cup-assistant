import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cancelBetAction } from '@/app/actions'
import LocalTime from '@/components/local-time'
import SettingsSection from '@/components/settings-section'
import SuccessBanner from '@/components/success-banner'
import { getTournament } from '@/lib/tournaments'
import type { Bet } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ success?: string }>
}

export default async function AccountPage({ searchParams }: Props) {
  const { success } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, betsResult] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false }),
  ])

  const profile = profileResult.data
  const bets: Bet[] = betsResult.data ?? []
  const balance = (profile?.wallet_balance as number) ?? 0

  const pending = bets.filter((b) => b.status === 'pending')
  const lockedAmount = pending.reduce((sum, b) => sum + b.stake, 0)
  const settled = bets.filter((b) => b.status !== 'pending')

  // P&L calculations (void/cancelled bets excluded — stake was refunded)
  const nonVoid = settled.filter((b) => b.status !== 'void')
  const totalStaked = nonVoid.reduce((sum, b) => sum + b.stake, 0)
  const totalReturned = nonVoid.reduce((sum, b) => sum + (b.payout ?? 0), 0)
  const netPnl = totalReturned - totalStaked
  const wonCount = settled.filter((b) => b.status === 'won').length
  const settledCount = settled.filter((b) => b.status !== 'void').length

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">My Account</h1>
      {success && <SuccessBanner type={success} />}

      {/* Balance & P&L summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Balance"
          value={`$${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`}
          sub={lockedAmount > 0 ? `$${lockedAmount.toFixed(2)} in ${pending.length} pending bet${pending.length !== 1 ? 's' : ''}` : undefined}
          accent
        />
        <StatCard
          label="Net P&L"
          value={`${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`}
          positive={netPnl >= 0}
          negative={netPnl < 0}
        />
        <StatCard label="Bets Won" value={settledCount > 0 ? `${wonCount}/${settledCount}` : '—'} />
        <StatCard label="Total Staked" value={totalStaked > 0 ? `$${totalStaked.toFixed(2)}` : '—'} />
      </div>

      {/* Pending bets */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Pending Bets
            {pending.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">({pending.length})</span>
            )}
          </h2>
          <Link href="/" className="text-sm text-amber-500 hover:text-amber-400">
            Place a bet →
          </Link>
        </div>
        <p className="text-xs text-slate-500 mb-3">Bets are settled once daily at 6 am UTC. Results may take up to 24 hours to reflect.</p>

        {pending.length === 0 ? (
          <p className="text-slate-400 text-sm">No pending bets.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((b) => <BetRow key={b.id} bet={b} />)}
          </div>
        )}
      </section>

      {/* Settled bets */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Settled Bets
          {settled.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">({settled.length})</span>
          )}
        </h2>

        {settled.length === 0 ? (
          <p className="text-slate-400 text-sm">No settled bets yet.</p>
        ) : (
          <div className="space-y-2">
            {settled.map((b) => <BetRow key={b.id} bet={b} />)}
          </div>
        )}
      </section>

      <SettingsSection />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
  positive,
  negative,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  positive?: boolean
  negative?: boolean
}) {
  const valueClass = accent
    ? 'text-amber-400'
    : positive
    ? 'text-green-400'
    : negative
    ? 'text-red-400'
    : 'text-white'

  const borderClass = positive
    ? 'border-l-4 border-l-green-500'
    : negative
    ? 'border-l-4 border-l-red-500'
    : ''

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-4 ${borderClass}`}>
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <div className={`text-lg font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function BetRow({ bet }: { bet: Bet }) {
  const selectionLabel =
    bet.selection === 'home' ? bet.home_team
    : bet.selection === 'away' ? bet.away_team
    : bet.selection === 'draw' ? 'Draw'
    : bet.selection === 'over' ? 'Over 2.5'
    : 'Under 2.5'

  const statusClass = {
    pending: 'text-slate-400 bg-slate-700',
    won: 'text-green-300 bg-green-900/50',
    lost: 'text-red-300 bg-red-900/40',
    void: 'text-slate-400 bg-slate-700',
  }[bet.status]

  const now = new Date()
  const canCancel =
    bet.status === 'pending' &&
    (bet.commence_time
      ? new Date(bet.commence_time) > now
      : bet.match_date >= now.toISOString().split('T')[0])

  const rowBorderClass =
    bet.status === 'won' ? 'border-l-2 border-l-green-500' :
    bet.status === 'lost' ? 'border-l-2 border-l-red-500' :
    'border-l-2 border-l-slate-600'

  const tournamentLabel = getTournament(bet.competition)?.shortName ?? bet.competition

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap ${rowBorderClass}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">
            {bet.home_team} vs {bet.away_team}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-amber-500/80 bg-amber-900/20 border border-amber-800/40 rounded px-1.5 py-0.5">
            {tournamentLabel}
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          {selectionLabel} @ {bet.odds.toFixed(2)} · ${bet.stake.toFixed(2)} stake ·{' '}
          {new Date(bet.placed_at).toLocaleDateString()}
          {bet.commence_time && (
            <span className="ml-1">
              · kicks off <LocalTime iso={bet.commence_time} />
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {canCancel && (
          <form action={cancelBetAction}>
            <input type="hidden" name="bet_id" value={bet.id} />
            <button
              type="submit"
              className="text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 px-2.5 py-1 rounded-md transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
        <span className={`text-xs font-semibold px-2 py-1 rounded-md uppercase ${statusClass}`}>
          {bet.status}
        </span>
        {bet.payout != null && bet.payout > 0 && bet.status !== 'void' && (
          <div className="text-xs text-green-400">
            +${bet.payout.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}
