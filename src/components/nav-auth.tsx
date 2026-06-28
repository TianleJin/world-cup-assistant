'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
          className="text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-md"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md transition-colors"
        >
          Register
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {balance !== null && (
        <Link
          href="/account"
          className="hidden sm:flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.12] rounded-lg px-3 py-1.5 transition-colors"
        >
          <span className="text-xs text-slate-400">Balance</span>
          <span className="text-sm font-bold text-green-400">
            ${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </span>
        </Link>
      )}
      <Link
        href="/account"
        className="text-sm text-slate-300 hover:text-white transition-colors"
      >
        My Account
      </Link>
      <button
        onClick={signOut}
        className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
