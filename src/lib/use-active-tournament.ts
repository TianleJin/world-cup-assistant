import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getTournament, DEFAULT_TOURNAMENT_SLUG, type Tournament } from '@/lib/tournaments'

const STORAGE_KEY = 'lastTournament'

/**
 * Resolves the tournament the nav should reflect, for use in client components.
 *
 * - On a tournament route (/<slug>/...), that tournament is the active section and
 *   is remembered in localStorage.
 * - On a global route (/account, /login, …), there is no tournament in the URL, so
 *   we fall back to the last-visited tournament (or the default). This keeps the
 *   section links + switcher populated so the user can navigate back without having
 *   to reselect a tournament.
 * - On the hub (/), we intentionally show no fallback so it stays a clean picker.
 *
 * `isActiveSection` is true only when the tournament comes from the URL, so callers
 * can avoid highlighting a nav item on pages the user isn't actually inside.
 */
export function useActiveTournament(): {
  pathname: string
  tournament: Tournament | undefined
  isActiveSection: boolean
} {
  const pathname = usePathname()
  const slug = pathname.split('/')[1] ?? ''
  const pathTournament = getTournament(slug)
  const isHub = pathname === '/'
  const [fallback, setFallback] = useState<Tournament | undefined>(undefined)

  useEffect(() => {
    if (pathTournament) {
      try {
        localStorage.setItem(STORAGE_KEY, pathTournament.slug)
      } catch {}
      setFallback(undefined)
      return
    }
    if (isHub) {
      setFallback(undefined)
      return
    }
    let remembered: Tournament | undefined
    try {
      remembered = getTournament(localStorage.getItem(STORAGE_KEY) ?? '')
    } catch {}
    setFallback(remembered ?? getTournament(DEFAULT_TOURNAMENT_SLUG))
  }, [pathTournament, isHub])

  return {
    pathname,
    tournament: pathTournament ?? fallback,
    isActiveSection: !!pathTournament,
  }
}
