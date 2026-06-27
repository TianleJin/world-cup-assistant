'use client'

import { useState, useEffect } from 'react'
import MatchCard from '@/components/match-card'
import Link from 'next/link'
import type { Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

function localDateKey(date: Date) {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function HomeMatchSection({ matches, highlights }: { matches: Match[]; highlights?: Record<number, YouTubeClip[]> }) {
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState<Match[]>([])
  const [today, setToday] = useState<Match[]>([])
  const [tomorrow, setTomorrow] = useState<Match[]>([])
  const [recent, setRecent] = useState<Match[]>([])

  useEffect(() => {
    const now = new Date()
    const todayKey = localDateKey(now)
    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowKey = localDateKey(tomorrowDate)

    setLive(matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED'))

    setToday(matches.filter(m => {
      if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return false
      return localDateKey(new Date(m.utcDate)) === todayKey
    }))

    setTomorrow(matches.filter(m => {
      if (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED') return false
      return localDateKey(new Date(m.utcDate)) === tomorrowKey
    }))

    setRecent(
      matches
        .filter(m => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
        .slice(0, 6)
    )

    setReady(true)
  }, [matches])

  if (!ready) return null

  const noUpcoming = live.length === 0 && today.length === 0 && tomorrow.length === 0

  return (
    <div className="space-y-8">
      {live.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Live Now
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map(m => <MatchCard key={m.id} match={m} showBetLink clips={highlights?.[m.id]} />)}
          </div>
        </section>
      )}

      {today.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{"Today's Matches"}</h2>
            <Link href="/schedule" className="text-sm text-green-500 hover:text-green-400">Full schedule →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {today.map(m => <MatchCard key={m.id} match={m} showBetLink clips={highlights?.[m.id]} />)}
          </div>
        </section>
      )}

      {tomorrow.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{"Tomorrow's Matches"}</h2>
            <Link href="/schedule" className="text-sm text-green-500 hover:text-green-400">Full schedule →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tomorrow.slice(0, 6).map(m => <MatchCard key={m.id} match={m} showBetLink clips={highlights?.[m.id]} />)}
          </div>
        </section>
      )}

      {noUpcoming && recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Results</h2>
            <Link href="/results" className="text-sm text-green-500 hover:text-green-400">All results →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map(m => <MatchCard key={m.id} match={m} clips={highlights?.[m.id]} />)}
          </div>
        </section>
      )}

      {noUpcoming && recent.length === 0 && (
        <p className="text-slate-400 text-sm">No matches to display.</p>
      )}
    </div>
  )
}
