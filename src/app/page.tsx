import { getMatches } from '@/lib/football-data'
import { getWorldCupNews } from '@/lib/news-api'
import { getFifaChannelVideos, findMatchClips } from '@/lib/youtube'
import { createClient } from '@/lib/supabase/server'
import HomeMatchSection from '@/components/home-match-section'
import Link from 'next/link'
import type { NewsArticle, Bet, Match } from '@/types'
import type { YouTubeClip } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matches, clips, newsResult, profileResult, betsResult, pendingResult] = await Promise.all([
    getMatches(),
    getFifaChannelVideos(),
    getWorldCupNews(1),
    user ? supabase.from('user_profiles').select('wallet_balance').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('bets').select('*').eq('user_id', user.id).neq('status', 'void').order('placed_at', { ascending: false }).limit(3) : Promise.resolve({ data: null }),
    user ? supabase.from('bets').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'pending') : Promise.resolve({ count: 0 }),
  ])

  const balance = profileResult.data?.wallet_balance as number | null
  const recentBets: Bet[] = betsResult.data ?? []
  const pendingCount = (pendingResult as { count: number | null }).count ?? 0

  const highlights: Record<number, YouTubeClip[]> = {}
  for (const m of matches as Match[]) {
    const found = findMatchClips(clips, m.homeTeam.name, m.awayTeam.name)
    if (found.length > 0) highlights[m.id] = found
  }


  const news = newsResult.articles.slice(0, 6)

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center py-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          FIFA World Cup 2026
        </h1>
        <p className="text-slate-400 text-sm">USA · Canada · Mexico</p>
      </div>

      {/* Portfolio widget — logged-in users only */}
      {user && balance !== null && (
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Balance</div>
                <div className="text-xl font-bold text-green-400">
                  ${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {recentBets.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Recent bets</div>
                  <div className="flex gap-2">
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
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-800 px-2.5 py-1 rounded-full">
                  {pendingCount} pending
                </span>
              )}
              <Link href="/account" className="text-sm text-green-500 hover:text-green-400">
                Full account →
              </Link>
              <Link href="/odds" className="text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                Place bet
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Live / today / tomorrow / recent — grouped by local date */}
      <HomeMatchSection matches={matches} highlights={highlights} />

      {/* Quick links */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/standings', label: 'Standings', icon: '🏆' },
          { href: '/schedule', label: 'Schedule', icon: '📅' },
          { href: '/news', label: 'News', icon: '📰' },
          { href: '/odds', label: 'Bet Now', icon: '💰' },
        ].map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-sm font-medium text-slate-200">{label}</div>
          </Link>
        ))}
      </section>

      {/* Latest news */}
      {news.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Latest News</h2>
            <Link href="/news" className="text-sm text-green-500 hover:text-green-400">
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.urlToImage}
                    alt=""
                    className="w-full h-36 object-cover"
                  />
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
