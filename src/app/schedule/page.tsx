import { getMatches } from '@/lib/football-data'
import MatchDayList from '@/components/match-day-list'
import type { Match } from '@/types'

export const revalidate = 300

export default async function SchedulePage() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  const matches = (await getMatches('TIMED,SCHEDULED')).filter(
    (m: Match) => new Date(m.utcDate).getTime() > cutoff
  )
  const sorted = [...matches].sort(
    (a: Match, b: Match) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  )

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Upcoming Schedule</h1>
      {sorted.length === 0 ? (
        <p className="text-slate-400">No upcoming matches scheduled.</p>
      ) : (
        <MatchDayList matches={sorted} showBetLink />
      )}
    </div>
  )
}
