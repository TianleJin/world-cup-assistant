import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavAuth from './nav-auth'
import { NavDesktopLinks, NavMobileLinks } from './nav-links'
import NavTournamentSwitcher from './nav-tournament-switcher'

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
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-1.5" style={{ fontFamily: 'var(--font-russo), sans-serif' }}>
            <span className="text-white">FOOTY</span><span className="text-amber-400">HQ</span>
          </Link>
          <NavTournamentSwitcher />
          <NavDesktopLinks />
        </div>
        <NavAuth user={user} balance={balance} />
      </div>

      {/* Mobile nav */}
      <NavMobileLinks />
    </nav>
  )
}
