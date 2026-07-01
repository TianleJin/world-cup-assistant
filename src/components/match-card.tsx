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

const STAGE_NICE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-final',
  SEMI_FINALS: 'Semi-final',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
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
    : (STAGE_NICE_LABELS[match.stage] ?? match.stage.replace(/_/g, ' '))

  const isPsoFinished = isFinished && hasPens

  return (
    <div className={`bg-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:shadow-lg hover:shadow-black/20 transition-all duration-150 ${
      isPsoFinished
        ? 'border border-slate-700 hover:border-slate-600 border-t-2 border-t-amber-500/60'
        : 'border border-slate-700 hover:border-slate-600'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="bg-amber-900/25 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
          {stageLabel}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 bg-red-900/30 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            {STATUS_LABEL[match.status]}
          </span>
        ) : isFinished ? (
          hasPens ? (
            <span className="bg-amber-900/30 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">PSO</span>
          ) : isAet ? (
            <span className="bg-blue-900/30 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">AET</span>
          ) : (
            <span className="bg-slate-700/60 text-slate-400 border border-slate-600/40 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">FT</span>
          )
        ) : (
          <span className="text-slate-400 text-xs shrink-0">
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
          <span className="text-amber-400 font-semibold">Penalties: {penHome} – {penAway}</span>
        </div>
      )}

      {/* Match highlight + bet link — mt-auto pins these to the bottom */}
      <div className="mt-auto flex flex-col gap-2">
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

        {showBetLink && !isFinished && match.status !== 'POSTPONED' && match.status !== 'CANCELLED' && (
          <Link
            href={`/odds`}
            className="text-xs border border-amber-600 text-amber-400 hover:bg-amber-600 hover:text-white rounded-md px-3 py-1.5 transition-colors text-center"
          >
            View Odds & Bet
          </Link>
        )}
      </div>
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
