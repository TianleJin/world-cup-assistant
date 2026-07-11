'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import { TOURNAMENTS } from '@/lib/tournaments'
import { useActiveTournament } from '@/lib/use-active-tournament'

// Dropdown to switch between tournaments. The trigger shows the active tournament
// (from the URL) or, on global pages like /account, the last-visited one so the user
// always has a labelled way back. Each item links to that tournament's dashboard.
export default function NavTournamentSwitcher() {
  const { pathname, tournament: active } = useActiveTournament()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Close the menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-md px-2.5 py-1.5 transition-colors"
      >
        <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="max-w-[9rem] truncate">{active ? active.shortName : 'Tournaments'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-slate-900 border border-white/[0.1] rounded-lg shadow-xl shadow-black/40 py-1 z-50">
          {TOURNAMENTS.map((t) => {
            const isActive = t.slug === active?.slug
            return (
              <Link
                key={t.slug}
                href={`/${t.slug}`}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-amber-400 bg-white/[0.04]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/80" />
                <div className="min-w-0">
                  <div className="truncate">{t.name}</div>
                  {t.subtitle && <div className="text-xs text-slate-500 truncate">{t.subtitle}</div>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
