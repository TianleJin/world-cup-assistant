import { getOdds } from '@/lib/odds-api'
import { getMatches } from '@/lib/football-data'
import { getTournament } from '@/lib/tournaments'
import { createClient } from '@/lib/supabase/server'
import { teamsMatch } from '@/lib/team-utils'
import { getFlagUrl } from '@/lib/flags'
import Link from 'next/link'
import LocalTime from '@/components/local-time'
import SuccessBanner from '@/components/success-banner'
import { notFound } from 'next/navigation'
import type { OddsRow, Match } from '@/types'

export const dynamic = 'force-dynamic'

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-final',
  SEMI_FINALS: 'Semi-final',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
}

function getStageLabel(match: Match | undefined): string | null {
  if (!match) return null
  const stage = STAGE_LABELS[match.stage] ?? match.stage.replace(/_/g, ' ')
  if (match.group) return `${stage} · ${match.group.replace('GROUP_', 'Group ')}`
  return stage
}

function findFixture(o: OddsRow, matches: Match[]): Match | undefined {
  const oddsDate = o.commence_time.split('T')[0]
  return matches.find((m) => {
    const matchDate = m.utcDate.split('T')[0]
    return (
      matchDate === oddsDate &&
      teamsMatch(m.homeTeam.name, o.home_team) &&
      teamsMatch(m.awayTeam.name, o.away_team)
    )
  })
}

interface Props {
  params: Promise<{ tournament: string }>
  searchParams: Promise<{ success?: string }>
}

export default async function OddsPage({ params, searchParams }: Props) {
  const { tournament } = await params
  const { success } = await searchParams
  const t = getTournament(tournament)
  if (!t || !t.betting) notFound()

  const base = `/${t.slug}`

  const [odds, matches, supabase] = await Promise.all([
    getOdds(t),
    getMatches(t),
    createClient(),
  ])

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const upcoming = odds.filter(
    (o: OddsRow) => new Date(o.commence_time) > new Date()
  )
  const lastFetchedIso = odds[0]?.fetched_at ?? null

  return (
    <div className="space-y-6">
      {success && <SuccessBanner type={success} />}

      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Betting Odds</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Sportsbet · refreshed every 6 hours
            {lastFetchedIso && (
              <span className="ml-2 text-slate-500">(last: <LocalTime iso={lastFetchedIso} />)</span>
            )}
          </p>
        </div>
        {!user && (
          <Link
            href="/register"
            className="text-sm bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-white transition-colors"
          >
            Register to bet
          </Link>
        )}
      </div>

      {upcoming.length === 0 && (
        <div className="text-slate-400 text-sm space-y-2">
          <p>No upcoming match odds available.</p>
          <p className="text-slate-500">
            Odds will appear here once bookmakers publish them. Check back soon.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((o: OddsRow) => {
          const fixture = findFixture(o, matches)
          return (
            <OddsCard key={o.match_id} odds={o} fixture={fixture} user={user} base={base} />
          )
        })}
      </div>
    </div>
  )
}

function OddsCard({
  odds,
  fixture,
  user,
  base,
}: {
  odds: OddsRow
  fixture: Match | undefined
  user: { id: string } | null
  base: string
}) {
  const stageLabel = getStageLabel(fixture)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-4">
      {/* Stage + kickoff */}
      <div className="flex items-center justify-between text-xs">
        {stageLabel && <span className="text-amber-500 font-medium">{stageLabel}</span>}
        <span className="text-slate-400">
          <LocalTime iso={odds.commence_time} options={{ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }} />
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamRow name={odds.home_team} />
        <div className="text-xs text-slate-500 pl-7">vs</div>
        <TeamRow name={odds.away_team} />
      </div>

      {/* Match winner buttons */}
      <div className={`grid gap-2 ${odds.draw_odds ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <OddsButton
          label={shortName(odds.home_team)}
          sublabel="1"
          price={odds.home_odds}
          matchId={odds.match_id}
          selection="home"
          user={user}
          base={base}
        />
        {odds.draw_odds && (
          <OddsButton
            label="Draw"
            sublabel="X"
            price={odds.draw_odds}
            matchId={odds.match_id}
            selection="draw"
            user={user}
            base={base}
          />
        )}
        <OddsButton
          label={shortName(odds.away_team)}
          sublabel="2"
          price={odds.away_odds}
          matchId={odds.match_id}
          selection="away"
          user={user}
          base={base}
        />
      </div>
    </div>
  )
}

function TeamRow({ name }: { name: string }) {
  const flagUrl = getFlagUrl(name)
  return (
    <div className="flex items-center gap-2">
      {flagUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flagUrl} alt={name} className="w-5 h-4 object-cover rounded-sm flex-shrink-0" />
      ) : (
        <div className="w-5 h-4 bg-slate-700 rounded-sm flex-shrink-0" />
      )}
      <span className="text-sm font-medium text-white">{name}</span>
    </div>
  )
}

function shortName(name: string): string {
  // Use last word for button labels (e.g. "Costa Rica" → "Rica", "USA" → "USA")
  const words = name.split(' ')
  return words.length > 2 ? words[words.length - 1] : name
}

function OddsButton({
  label,
  sublabel,
  price,
  matchId,
  selection,
  user,
  base,
}: {
  label: string
  sublabel: string
  price: number | null
  matchId: string
  selection: string
  user: { id: string } | null
  base: string
}) {
  if (!price) {
    return (
      <div className="bg-slate-700/50 rounded-lg px-2 py-3 text-center">
        <div className="text-xs text-slate-500">{sublabel}</div>
        <div className="text-slate-500 text-xs mt-0.5">N/A</div>
      </div>
    )
  }

  const href = user ? `${base}/bet/${matchId}?selection=${selection}` : `/login?redirected=1`

  return (
    <Link
      href={href}
      className="bg-slate-700 hover:bg-slate-600 border border-slate-500 hover:border-amber-500 rounded-lg px-2 py-3 text-center transition-colors group"
    >
      <div className="text-xs text-slate-400 group-hover:text-green-200 truncate">{label}</div>
      <div className="text-white font-bold text-lg mt-0.5">{price.toFixed(2)}</div>
    </Link>
  )
}
