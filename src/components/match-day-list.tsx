'use client'

import { useState, useEffect } from 'react'
import MatchCard from '@/components/match-card'
import type { Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

interface Props {
  matches: Match[]
  showBetLink?: boolean
  highlights?: Record<number, YouTubeClip[]>
}

export default function MatchDayList({ matches, showBetLink, highlights }: Props) {
  const [groups, setGroups] = useState<{ label: string; matches: Match[] }[]>([])

  useEffect(() => {
    const byDate = new Map<string, Match[]>()
    for (const m of matches) {
      const key = new Date(m.utcDate).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push(m)
    }
    setGroups([...byDate.entries()].map(([label, matches]) => ({ label, matches })))
  }, [matches])

  // Server render: group by UTC date with UTC label to avoid hydration mismatch
  if (groups.length === 0) {
    const byDate = new Map<string, Match[]>()
    for (const m of matches) {
      const key = m.utcDate.split('T')[0]
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push(m)
    }
    return (
      <div className="space-y-8">
        {[...byDate.entries()].map(([key, dayMatches]) => (
          <section key={key}>
            <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
              {key}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayMatches.map((m) => <MatchCard key={m.id} match={m} showBetLink={showBetLink} clips={highlights?.[m.id]} />)}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map(({ label, matches: dayMatches }) => (
        <section key={label}>
          <h2 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
            {label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dayMatches.map((m) => <MatchCard key={m.id} match={m} showBetLink={showBetLink} clips={highlights?.[m.id]} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
