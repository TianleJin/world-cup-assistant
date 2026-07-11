import { getMatches } from '@/lib/football-data'
import { getPlaylistVideos, findMatchClips } from '@/lib/youtube'
import { getTournament, TOURNAMENTS } from '@/lib/tournaments'
import MatchDayList from '@/components/match-day-list'
import { notFound } from 'next/navigation'
import type { Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

export const revalidate = 300

export function generateStaticParams() {
  return TOURNAMENTS.map((t) => ({ tournament: t.slug }))
}

interface Props {
  params: Promise<{ tournament: string }>
}

export default async function ResultsPage({ params }: Props) {
  const { tournament } = await params
  const t = getTournament(tournament)
  if (!t) notFound()

  const [matches, clips] = await Promise.all([
    getMatches(t, 'FINISHED'),
    t.youtubePlaylistId ? getPlaylistVideos(t.youtubePlaylistId) : Promise.resolve([] as YouTubeClip[]),
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
