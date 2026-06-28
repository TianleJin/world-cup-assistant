import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavAuth from './nav-auth'

const links = [
  { href: '/standings', label: 'Standings' },
  { href: '/results', label: 'Results' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/news', label: 'News' },
  { href: '/odds', label: 'Odds' },
]

export default async function Nav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const balance = user
    ? ((await supabase.from('user_profiles').select('wallet_balance').eq('id', user.id).single()).data?.wallet_balance as number | null)
    : null

  return (
    <nav className="bg-slate-950/80 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-1.5">
            <span className="text-white">WC</span><span className="text-green-400">2026</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-md transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <NavAuth user={user} balance={balance} />
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-white/[0.08] flex overflow-x-auto">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex-shrink-0 px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
