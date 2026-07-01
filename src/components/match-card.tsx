import Link from 'next/link'
import LocalTime from '@/components/local-time'
import type { Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

interface Props {
  match: Match
  showBetLink?: boolean
  clips?: YouTubeClip[]
}

const STATUS_LABEL: Record<string, string> = {
  IN_PLAY: 'LIVE',
  PAUSED: 'HT',
  FINISHED: 'FT',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
}

export default function MatchCard({ match, showBetLink, clips }: Props) {
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const isFinished = match.status === 'FINISHED'
  const hasScore = isLive || isFinished

  const homeWon = match.score.winner === 'HOME_TEAM'
  const awayWon = match.score.winner === 'AWAY_TEAM'

  const duration = match.score.duration
  const isAet = duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT'
  const hasPens = duration === 'PENALTY_SHOOTOUT'
  const penHome = match.score.penalties?.home
  const penAway = match.score.penalties?.away

  // fullTime from football-data.org includes penalty goals for PSO matches,
  // so subtract them to get the pre-penalty (aet) score for display.
  const displayHome = hasPens && penHome != null
    ? (match.score.fullTime.home ?? 0) - penHome
    : match.score.fullTime.home
  const displayAway = hasPens && penAway != null
    ? (match.score.fullTime.away ?? 0) - penAway
    : match.score.fullTime.away

  const stageLabel = match.group
    ? match.group.replace('GROUP_', 'Group ')
    : match.stage.replace(/_/g, ' ')

  const ftLabel =
    duration === 'PENALTY_SHOOTOUT' ? 'PSO'
    : duration === 'EXTRA_TIME' ? 'AET'
    : 'FT'

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
          <span className="text-slate-500 font-medium">{ftLabel}</span>
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
          score={displayHome}
          showScore={hasScore}
          bold={homeWon}
        />
        <TeamRow
          name={match.awayTeam.name}
          crest={match.awayTeam.crest}
          score={displayAway}
          showScore={hasScore}
          bold={awayWon}
        />
      </div>

      {/* Penalty shootout tally */}
      {isFinished && hasPens && penHome != null && penAway != null && (
        <div className="text-xs text-center -mt-1">
          <span className="text-slate-300 font-semibold">Penalties: {penHome} – {penAway}</span>
        </div>
      )}

      {/* Match highlight */}
      {clips && clips.length > 0 && (
        <div className="border-t border-slate-700 pt-2">
          <a
            href={clips[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            <span className="text-red-500 flex-shrink-0">▶</span>
            <span>Match Highlights</span>
          </a>
        </div>
      )}

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
  name: string | null
  crest: string | null
  score: number | null
  showScore: boolean
  bold: boolean
}) {
  const displayName = name ?? 'TBD'
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
        ) : (
          <span className="w-5 h-5 rounded-full bg-slate-600 flex-shrink-0" />
        )}
        <span className={`text-sm truncate ${bold ? 'font-bold text-white' : !name ? 'text-slate-500' : 'text-slate-200'}`}>
          {displayName}
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
