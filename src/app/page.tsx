import Link from 'next/link'
import { TOURNAMENTS } from '@/lib/tournaments'
import { Trophy } from 'lucide-react'

export const metadata = {
  title: 'Football Tournament Assistant',
  description: 'Live scores, standings, news, and betting simulation across major football tournaments.',
}

export default function Hub() {
  return (
    <div className="space-y-10">
      <div className="text-center py-6">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2">
          <span className="text-white">Football </span>
          <span className="text-amber-400">Assistant</span>
        </h1>
        <p className="text-amber-500/70 text-xs font-semibold tracking-[0.25em] uppercase">
          Pick a tournament
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
        {TOURNAMENTS.map((t) => (
          <Link
            key={t.slug}
            href={`/${t.slug}`}
            className="group bg-slate-800 border border-slate-700 rounded-2xl p-6 transition-all hover:border-amber-700/60 hover:bg-white/[0.04] hover:scale-[1.01]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-900/25 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-white truncate">{t.name}</div>
                {t.subtitle && (
                  <div className="text-xs text-slate-400 mt-0.5">{t.subtitle}</div>
                )}
              </div>
            </div>
            <div className="mt-4 text-sm text-amber-500 group-hover:text-amber-400">
              Enter →
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
