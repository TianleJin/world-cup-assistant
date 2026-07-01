'use client'

import { useState, useEffect } from 'react'

export default function TimezoneLabel() {
  const [abbr, setAbbr] = useState<string | null>(null)

  useEffect(() => {
    const tz =
      new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? ''
    setAbbr(tz)
  }, [])

  if (!abbr) return null
  return <span className="text-xs text-slate-500">({abbr})</span>
}
