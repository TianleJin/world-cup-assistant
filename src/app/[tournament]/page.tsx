import { getMatches } from '@/lib/football-data'
import { getNews } from '@/lib/news-api'
import { getPlaylistVideos, findMatchClips } from '@/lib/youtube'
import { getTournament } from '@/lib/tournaments'
import { createClient } from '@/lib/supabase/server'
import HomeMatchSection from '@/components/home-match-section'
import SuccessBanner from '@/components/success-banner'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Trophy, Calendar, Newspaper, TrendingUp } from 'lucide-react'
import type { NewsArticle, Bet, Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ tournament: string }>
  searchParams: Promise<{ success?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { tournament } = await params
  const t = getTournament(tournament)
  return { title: t ? t.name : 'Football Tournament Assistant' }
}

export default async function Dashboard({ params, searchParams }: Props) {
  const { tournament } = await params
  const t = getTournament(tournament)
  if (!t) notFound()

  const { success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matches, clips, newsResult, profileResult, betsResult, pendingResult] = await Promise.all([
    getMatches(t),
    t.youtubePlaylistId ? getPlaylistVideos(t.youtubePlaylistId) : Promise.resolve([] as YouTubeClip[]),
    getNews(t, 1),
    user ? supabase.from('user_profiles').select('wallet_balance').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('bets').select('*').eq('user_id', user.id).eq('competition', t.slug).neq('status', 'void').order('placed_at', { ascending: false }).limit(10) : Promise.resolve({ data: null }),
    user ? supabase.from('bets').select('stake').eq('user_id', user.id).eq('competition', t.slug).eq('status', 'pending') : Promise.resolve({ data: [] }),
  ])

  const balance = profileResult.data?.wallet_balance as number | null
  const seen = new Set<string>()
  const recentBets: Bet[] = []
  for (const b of (betsResult.data ?? []) as Bet[]) {
    const key = b.odds_match_id ?? `${b.home_team}|${b.away_team}`
    if (!seen.has(key)) {
      seen.add(key)
      recentBets.push(b)
      if (recentBets.length === 3) break
    }
  }
  const pendingBets = (pendingResult as { data: { stake: number }[] | null }).data ?? []
  const pendingCount = pendingBets.length
  const lockedAmount = pendingBets.reduce((sum, b) => sum + b.stake, 0)

  const highlights: Record<number, YouTubeClip[]> = {}
  for (const m of matches as Match[]) {
    const found = findMatchClips(clips, m.homeTeam.name, m.awayTeam.name)
    if (found.length > 0) highlights[m.id] = found
  }

  const news = newsResult.articles.slice(0, 6)
  const base = `/${t.slug}`
  const showBetting = t.betting

  const quickLinks = [
    { href: `${base}/standings`, label: t.standingsLabel, Icon: Trophy },
    { href: `${base}/schedule`, label: 'Schedule', Icon: Calendar },
    { href: `${base}/news`, label: 'News', Icon: Newspaper },
    ...(showBetting ? [{ href: `${base}/odds`, label: 'Bet Now', Icon: TrendingUp }] : []),
  ]

  return (
    <div className="space-y-10">
      {success && <SuccessBanner type={success} />}

      {/* Hero */}
      <div className="text-center py-6">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-2">
          <span className="text-white">{t.name}</span>
        </h1>
        {t.subtitle && (
          <p className="text-amber-500/70 text-xs font-semibold tracking-[0.25em] uppercase">
            {t.subtitle}
          </p>
        )}
      </div>

      {/* Portfolio widget — logged-in users only, betting tournaments only */}
      {showBetting && user && balance !== null && (
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-shrink-0">
                <div className="text-xs text-slate-400 mb-0.5">Balance</div>
                <div className="text-xl font-bold text-amber-400">
                  ${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </div>
                {lockedAmount > 0 && (
                  <div className="text-xs text-slate-500 mt-0.5">${lockedAmount.toFixed(2)} in bets</div>
                )}
              </div>
              {recentBets.length > 0 && (
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 mb-1">Recent bets</div>
                  <div className="flex flex-wrap gap-2">
                    {recentBets.map((b) => (
                      <span
                        key={b.id}
                        className={`text-xs px-2 py-1 rounded-md font-medium ${
                          b.status === 'won' ? 'bg-green-900/60 text-green-300' :
                          b.status === 'lost' ? 'bg-red-900/50 text-red-300' :
                          'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {b.home_team.split(' ').pop()} v {b.away_team.split(' ').pop()}
                        {b.status === 'won' && ' ✓'}
                        {b.status === 'lost' && ' ✗'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center items-end gap-2 flex-shrink-0">
              {pendingCount > 0 && (
                <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-800 px-2.5 py-1 rounded-full">
                  {pendingCount} pending
                </span>
              )}
              <Link href="/account" className="text-sm text-amber-500 hover:text-amber-400">
                Full account →
              </Link>
              <Link href={`${base}/odds`} className="text-sm bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                Place bet
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Live / today / tomorrow / recent — grouped by local date */}
      <HomeMatchSection matches={matches} highlights={highlights} basePath={base} betting={showBetting} />

      {/* Quick links */}
      <section className={`grid gap-3 grid-cols-2 ${quickLinks.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {quickLinks.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-slate-800 hover:bg-white/[0.1] border border-slate-700 rounded-xl p-4 text-center transition-all hover:border-amber-800/60 hover:scale-[1.02]"
          >
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-900/25 flex items-center justify-center">
                <Icon className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="text-sm font-medium text-slate-200">{label}</div>
          </Link>
        ))}
      </section>

      {/* Latest news */}
      {news.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold border-l-2 border-l-amber-500 pl-3">Latest News</h2>
            <Link href={`${base}/news`} className="text-sm text-amber-500 hover:text-amber-400">
              All news →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((a: NewsArticle) => (
              <a
                key={a.url}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors"
              >
                {a.urlToImage && (
                  <div className="aspect-video overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.urlToImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs text-slate-400 mb-1">{a.source.name}</p>
                  <h3 className="text-sm font-medium leading-snug text-slate-100 line-clamp-2">
                    {a.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {new Date(a.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
