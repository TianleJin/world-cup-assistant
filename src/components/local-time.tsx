'use client'

import { useState, useEffect } from 'react'

interface Props {
  iso: string
  options?: Intl.DateTimeFormatOptions
}

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

export default function LocalTime({ iso, options }: Props) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    setLabel(new Date(iso).toLocaleString(undefined, options ?? DEFAULT_OPTIONS))
  }, [iso, options])

  if (!label) return null

  return <>{label}</>
}
