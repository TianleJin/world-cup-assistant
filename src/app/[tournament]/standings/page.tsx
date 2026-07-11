import { getStandings, getScorers, getMatches } from '@/lib/football-data'
import { getTournament, TOURNAMENTS } from '@/lib/tournaments'
import LocalTime from '@/components/local-time'
import { notFound } from 'next/navigation'
import type { Match, Standing, StandingRow } from '@/types'

export const revalidate = 300

export function generateStaticParams() {
  return TOURNAMENTS.map((t) => ({ tournament: t.slug }))
}

const KNOCKOUT_STAGES: { key: string; label: string }[] = [
  { key: 'LAST_32', label: 'Round of 32' },
  { key: 'LAST_16', label: 'Round of 16' },
  { key: 'QUARTER_FINALS', label: 'Quarter Finals' },
  { key: 'SEMI_FINALS', label: 'Semi Finals' },
  { key: 'THIRD_PLACE', label: 'Third Place' },
  { key: 'FINAL', label: 'Final' },
]

interface Props {
  params: Promise<{ tournament: string }>
}

export default async function StandingsPage({ params }: Props) {
  const { tournament } = await params
  const t = getTournament(tournament)
  if (!t) notFound()

  const isCup = t.format === 'cup'

  const [standings, scorersData, allMatches] = await Promise.all([
    getStandings(t),
    getScorers(t),
    isCup ? getMatches(t) : Promise.resolve([] as Match[]),
  ])

  const scorers = scorersData.scorers ?? []

  if (standings.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        {t.standingsLabel} not yet available.
      </div>
    )
  }

  // Only show TOTAL type — API also returns HOME and AWAY breakdowns
  const totalOnly = standings.filter((s: Standing) => s.type === 'TOTAL')

  const scorersSection = scorers.length > 0 && (
    <section>
      <h2 className="text-xl font-bold mb-4 border-l-2 border-l-amber-500 pl-3">Top Scorers</h2>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Player</th>
              <th className="text-left px-4 py-3">Team</th>
              <th className="text-right px-4 py-3">Goals</th>
              <th className="text-right px-4 py-3">Assists</th>
            </tr>
          </thead>
          <tbody>
            {scorers.slice(0, 10).map((s: { player: { id: number; name: string }; team: { crest: string; shortName?: string; name: string }; goals: number; assists: number | null }, i: number) => (
              <tr key={s.player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{s.player.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.team.crest} alt="" className="w-4 h-4 object-contain" />
                    <span className="text-slate-300">{s.team.shortName ?? s.team.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-400">{s.goals}</td>
                <td className="px-4 py-3 text-right text-slate-400">{s.assists ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  // League format: a single standings table, no groups/bracket.
  if (!isCup) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">{t.standingsLabel}</h1>
        <div className="space-y-6">
          {totalOnly.map((s: Standing) => (
            <GroupTable key={`${s.stage}-${s.type}`} standing={s} />
          ))}
        </div>
        {scorersSection}
      </div>
    )
  }

  // Cup format: group tables + knockout bracket.
  const knockoutMatches = (allMatches as Match[]).filter(m => m.stage !== 'GROUP_STAGE')
  const groupStandings = totalOnly.filter((s: Standing) => !!s.group)
  const hasGroups = groupStandings.length > 0
  const knockoutUnderway = knockoutMatches.some(m => m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED')

  const bracketSection = knockoutMatches.length > 0 && (
    <section className="space-y-6">
      <h2 className="text-xl font-bold border-l-2 border-l-amber-500 pl-3">Knockout Stage</h2>
      {KNOCKOUT_STAGES.map(({ key, label }) => {
        const stage = knockoutMatches.filter(m => m.stage === key)
        if (stage.length === 0) return null
        return (
          <div key={key}>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">{label}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stage.map(m => <BracketMatch key={m.id} match={m} />)}
            </div>
          </div>
        )
      })}
    </section>
  )

  const groupSection = hasGroups ? (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {groupStandings.map((s: Standing) => (
        <GroupTable key={s.group} standing={s} />
      ))}
    </div>
  ) : (
    <div className="space-y-6">
      {totalOnly.map((s: Standing) => (
        <GroupTable key={`${s.stage}-${s.type}`} standing={s} />
      ))}
    </div>
  )

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t.standingsLabel}</h1>

      {knockoutUnderway ? (
        <>
          {bracketSection}
          <section>
            <h2 className="text-xl font-bold mb-4 border-l-2 border-l-amber-500 pl-3">Group Stage</h2>
            {groupSection}
          </section>
        </>
      ) : (
        <>
          {groupSection}
          {bracketSection}
        </>
      )}

      {scorersSection}
    </div>
  )
}

function BracketMatch({ match }: { match: Match }) {
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const isFinished = match.status === 'FINISHED'
  const hasScore = isLive || isFinished
  const homeWon = match.score.winner === 'HOME_TEAM'
  const awayWon = match.score.winner === 'AWAY_TEAM'
  const homeName = match.homeTeam.name ?? 'TBD'
  const awayName = match.awayTeam.name ?? 'TBD'

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-2">
      <BracketTeamRow
        name={homeName}
        crest={match.homeTeam.crest}
        score={match.score.fullTime.home}
        showScore={hasScore}
        bold={homeWon}
      />
      <BracketTeamRow
        name={awayName}
        crest={match.awayTeam.crest}
        score={match.score.fullTime.away}
        showScore={hasScore}
        bold={awayWon}
      />
      <div className="text-xs text-slate-500 pt-1">
        {isLive ? (
          <span className="text-red-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            LIVE
          </span>
        ) : isFinished ? (
          <span>Full Time</span>
        ) : (
          <LocalTime iso={match.utcDate} options={{ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }} />
        )}
      </div>
    </div>
  )
}

function BracketTeamRow({ name, crest, score, showScore, bold }: {
  name: string; crest: string | null; score: number | null; showScore: boolean; bold: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
        ) : (
          <span className="w-4 h-4 rounded-full bg-slate-600 flex-shrink-0" />
        )}
        <span className={`text-sm truncate ${bold ? 'font-bold text-white' : name === 'TBD' ? 'text-slate-500' : 'text-slate-200'}`}>
          {name}
        </span>
      </div>
      {showScore && (
        <span className={`text-sm font-bold ml-1 flex-shrink-0 ${bold ? 'text-amber-400' : 'text-slate-300'}`}>
          {score ?? 0}
        </span>
      )}
    </div>
  )
}

function GroupTable({ standing }: { standing: Standing }) {
  const label = standing.group
    ? standing.group.replace('GROUP_', 'Group ')
    : standing.stage.replace(/_/g, ' ')

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 font-semibold text-sm text-slate-200">
        {label}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-700">
            <th className="text-left px-4 py-2">Team</th>
            <th className="text-right px-2 py-2">P</th>
            <th className="text-right px-2 py-2">W</th>
            <th className="text-right px-2 py-2">D</th>
            <th className="text-right px-2 py-2">L</th>
            <th className="text-right px-2 py-2">GD</th>
            <th className="text-right px-4 py-2 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standing.table.map((row: StandingRow, idx: number) => (
            <tr
              key={row.team.id}
              className={`border-b border-slate-700/40 ${idx < 2 ? 'bg-amber-900/10' : ''}`}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-4 text-right text-xs">{row.position}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {row.team.crest && <img src={row.team.crest} alt="" className="w-4 h-4 object-contain" />}
                  <span className="font-medium text-sm">{row.team.shortName ?? row.team.name}</span>
                </div>
              </td>
              <td className="text-right px-2 py-2.5 text-slate-400">{row.playedGames}</td>
              <td className="text-right px-2 py-2.5 text-slate-400">{row.won}</td>
              <td className="text-right px-2 py-2.5 text-slate-400">{row.draw}</td>
              <td className="text-right px-2 py-2.5 text-slate-400">{row.lost}</td>
              <td className="text-right px-2 py-2.5 text-slate-400">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="text-right px-4 py-2.5 font-bold text-white">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
