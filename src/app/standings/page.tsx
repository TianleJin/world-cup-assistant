import { getStandings, getScorers } from '@/lib/football-data'
import type { Standing, StandingRow } from '@/types'

export const revalidate = 300

export default async function StandingsPage() {
  const [standings, scorersData] = await Promise.all([
    getStandings(),
    getScorers(),
  ])

  const scorers = scorersData.scorers ?? []

  if (standings.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        Standings not yet available.
      </div>
    )
  }

  // Only show TOTAL type — API also returns HOME and AWAY breakdowns
  const totalOnly = standings.filter((s: Standing) => s.type === 'TOTAL')
  const groupStandings = totalOnly.filter((s: Standing) => !!s.group)
  const hasGroups = groupStandings.length > 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Standings</h1>

      {hasGroups ? (
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
      )}

      {/* Top scorers */}
      {scorers.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Top Scorers</h2>
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
                    <td className="px-4 py-3 text-right font-bold text-green-400">{s.goals}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{s.assists ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
              className={`border-b border-slate-700/40 ${idx < 2 ? 'bg-green-900/10' : ''}`}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 w-4 text-right text-xs">{row.position}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.team.crest} alt="" className="w-4 h-4 object-contain" />
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
