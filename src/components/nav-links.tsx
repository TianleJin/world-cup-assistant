'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/standings', label: 'Bracket' },
  { href: '/results', label: 'Results' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/news', label: 'News' },
  { href: '/odds', label: 'Odds' },
]

export function NavDesktopLinks() {
  const pathname = usePathname()
  return (
    <div className="hidden md:flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              active
                ? 'text-amber-400 font-medium bg-white/[0.06] underline decoration-amber-400 decoration-2 underline-offset-4'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

export function NavMobileLinks() {
  const pathname = usePathname()
  return (
    <div className="md:hidden border-t border-white/[0.08] flex overflow-x-auto">
      {links.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-shrink-0 px-4 py-2.5 text-sm transition-colors border-b-2 ${
              active
                ? 'text-amber-400 border-amber-400'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
