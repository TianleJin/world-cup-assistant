import { getMatches } from '@/lib/football-data'
import MatchDayList from '@/components/match-day-list'
import type { Match } from '@/types'

export const revalidate = 300

export default async function ResultsPage() {
  const matches = await getMatches('FINISHED')
  const sorted = [...matches].sort(
    (a: Match, b: Match) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
  )

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Results</h1>
      {sorted.length === 0 ? (
        <p className="text-slate-400">No results yet. Check back after the first match.</p>
      ) : (
        <MatchDayList matches={sorted} />
      )}
    </div>
  )
}
