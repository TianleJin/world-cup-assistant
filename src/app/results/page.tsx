import { getMatches } from '@/lib/football-data'
import { getFifaChannelVideos, findMatchClips } from '@/lib/youtube'
import MatchDayList from '@/components/match-day-list'
import type { Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

export const revalidate = 300

export default async function ResultsPage() {
  const [matches, clips] = await Promise.all([
    getMatches('FINISHED'),
    getFifaChannelVideos(),
  ])

  const sorted = [...matches].sort(
    (a: Match, b: Match) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
  )

  // Build match ID → clips map
  const highlights: Record<number, YouTubeClip[]> = {}
  for (const m of sorted) {
    const found = findMatchClips(clips, m.homeTeam.name, m.awayTeam.name)
    if (found.length > 0) highlights[m.id] = found
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Results</h1>
      {sorted.length === 0 ? (
        <p className="text-slate-400">No results yet. Check back after the first match.</p>
      ) : (
        <MatchDayList matches={sorted} highlights={highlights} />
      )}
    </div>
  )
}
