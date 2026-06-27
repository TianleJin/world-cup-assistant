'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Try signing in instead.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    // If email confirmation is disabled in Supabase, the user is logged in immediately
    if (data.session) {
      window.location.href = '/'
    } else {
      // Email confirmation required
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📧</div>
          <h2 className="text-xl font-bold">Check your email</h2>
          <p className="text-slate-400 text-sm">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click the link to activate your account and claim your $10,000 starting credit.
          </p>
          <p className="text-xs text-slate-500">
            Tip: You can also disable email confirmation in your Supabase project under{' '}
            <strong>Authentication → Email</strong> for easier local testing.
          </p>
          <Link href="/login" className="text-green-500 hover:text-green-400 text-sm block">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-slate-400 text-sm mt-1">
            Get <span className="text-green-400 font-semibold">$10,000</span> in virtual credit to start betting
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-3 py-2">
              {error.includes('signing in') ? (
                <>
                  An account with this email already exists.{' '}
                  <Link href="/login" className="underline hover:text-red-100">Sign in instead</Link>.
                </>
              ) : (
                error
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-green-500 hover:text-green-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
