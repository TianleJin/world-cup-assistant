import { getMatches } from '@/lib/football-data'
import MatchCard from '@/components/match-card'
import type { Match } from '@/types'

export const revalidate = 300

export default async function SchedulePage() {
  const matches = await getMatches('TIMED,SCHEDULED')
  const sorted = [...matches].sort(
    (a: Match, b: Match) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  )

  // Group by date
  const byDate = new Map<string, Match[]>()
  for (const m of sorted) {
    const d = new Date(m.utcDate).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(m)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Upcoming Schedule</h1>

      {byDate.size === 0 && (
        <p className="text-slate-400">No upcoming matches scheduled.</p>
      )}

      {[...byDate.entries()].map(([date, dayMatches]) => (
        <section key={date}>
          <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
            {date}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dayMatches.map((m: Match) => (
              <MatchCard key={m.id} match={m} showBetLink />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
