import { getMatches } from '@/lib/football-data'
import { getTournament, TOURNAMENTS } from '@/lib/tournaments'
import MatchDayList from '@/components/match-day-list'
import TimezoneLabel from '@/components/timezone-label'
import { notFound } from 'next/navigation'
import type { Match } from '@/types'

export const revalidate = 300

export function generateStaticParams() {
  return TOURNAMENTS.map((t) => ({ tournament: t.slug }))
}

interface Props {
  params: Promise<{ tournament: string }>
}

export default async function SchedulePage({ params }: Props) {
  const { tournament } = await params
  const t = getTournament(tournament)
  if (!t) notFound()

  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  const matches = (await getMatches(t, 'TIMED,SCHEDULED')).filter(
    (m: Match) => new Date(m.utcDate).getTime() > cutoff
  )
  const sorted = [...matches].sort(
    (a: Match, b: Match) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  )

  const oddsHref = t.betting ? `/${t.slug}/odds` : undefined

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Upcoming Schedule <TimezoneLabel /></h1>
      {sorted.length === 0 ? (
        <p className="text-slate-400">No upcoming matches scheduled.</p>
      ) : (
        <MatchDayList matches={sorted} oddsHref={oddsHref} />
      )}
    </div>
  )
}
