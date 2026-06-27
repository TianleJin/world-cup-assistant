import Link from 'next/link'
import LocalTime from '@/components/local-time'
import type { Match } from '@/types'

interface Props {
  match: Match
  showBetLink?: boolean
}

const STATUS_LABEL: Record<string, string> = {
  IN_PLAY: 'LIVE',
  PAUSED: 'HT',
  FINISHED: 'FT',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
}

export default function MatchCard({ match, showBetLink }: Props) {
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const isFinished = match.status === 'FINISHED'
  const hasScore = isLive || isFinished

  const homeWon = match.score.winner === 'HOME_TEAM'
  const awayWon = match.score.winner === 'AWAY_TEAM'

  const stageLabel = match.group
    ? match.group.replace('GROUP_', 'Group ')
    : match.stage.replace(/_/g, ' ')

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{stageLabel}</span>
        {isLive ? (
          <span className="flex items-center gap-1 text-red-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {STATUS_LABEL[match.status]}
          </span>
        ) : isFinished ? (
          <span className="text-slate-500 font-medium">FT</span>
        ) : (
          <span className="text-slate-400">
            <LocalTime iso={match.utcDate} options={{ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }} />
          </span>
        )}
      </div>

      {/* Teams & score */}
      <div className="space-y-2">
        <TeamRow
          name={match.homeTeam.name}
          crest={match.homeTeam.crest}
          score={match.score.fullTime.home}
          showScore={hasScore}
          bold={homeWon}
        />
        <TeamRow
          name={match.awayTeam.name}
          crest={match.awayTeam.crest}
          score={match.score.fullTime.away}
          showScore={hasScore}
          bold={awayWon}
        />
      </div>

      {/* Bet link */}
      {showBetLink && !isFinished && match.status !== 'POSTPONED' && match.status !== 'CANCELLED' && (
        <Link
          href={`/odds`}
          className="mt-1 w-full text-center text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg py-2 transition-colors"
        >
          View Odds & Bet
        </Link>
      )}
    </div>
  )
}

function TeamRow({
  name,
  crest,
  score,
  showScore,
  bold,
}: {
  name: string
  crest: string
  score: number | null
  showScore: boolean
  bold: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        <span className={`text-sm truncate ${bold ? 'font-bold text-white' : 'text-slate-200'}`}>
          {name}
        </span>
      </div>
      {showScore && (
        <span className={`text-lg font-bold ml-3 ${bold ? 'text-green-400' : 'text-slate-300'}`}>
          {score ?? 0}
        </span>
      )}
    </div>
  )
}
