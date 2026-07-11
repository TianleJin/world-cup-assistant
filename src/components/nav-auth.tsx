'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserRound, LogOut, LogIn, UserPlus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function NavAuth({ user, balance }: { user: User | null; balance: number | null }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          aria-label="Sign in"
          className="flex items-center text-slate-300 hover:text-white p-2 sm:px-3 sm:py-1.5 rounded-md"
        >
          <LogIn className="w-5 h-5 sm:hidden" />
          <span className="hidden sm:inline text-sm">Sign in</span>
        </Link>
        <Link
          href="/register"
          aria-label="Register"
          className="flex items-center bg-amber-600 hover:bg-amber-500 text-white p-2 sm:px-3 sm:py-1.5 rounded-md transition-colors"
        >
          <UserPlus className="w-5 h-5 sm:hidden" />
          <span className="hidden sm:inline text-sm">Register</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {balance !== null && (
        <Link
          href="/account"
          className="hidden sm:flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.12] rounded-lg px-3 py-1.5 transition-colors"
        >
          <span className="text-xs text-slate-400">Balance</span>
          <span className="text-sm font-bold text-amber-400">
            ${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </span>
        </Link>
      )}
      <Link
        href="/account"
        aria-label="My Account"
        className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
      >
        <UserRound className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline text-sm">My Account</span>
      </Link>
      <button
        onClick={signOut}
        aria-label="Sign out"
        className="flex items-center text-slate-500 hover:text-slate-300 transition-colors"
      >
        <LogOut className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline text-sm">Sign out</span>
      </button>
    </div>
  )
}
