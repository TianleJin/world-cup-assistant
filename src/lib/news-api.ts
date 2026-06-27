import type { NewsArticle } from '@/types'

const BASE = 'https://newsapi.org/v2'

export async function getWorldCupNews(page = 1): Promise<{ articles: NewsArticle[]; totalResults: number }> {
  const params = new URLSearchParams({
    q: '"FIFA World Cup 2026" OR ("World Cup 2026" AND (soccer OR football OR FIFA OR goal OR match))',
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: '40', // fetch more so we have enough after filtering
    page: String(page),
    apiKey: process.env.NEWS_API_KEY!,
  })

  const res = await fetch(`${BASE}/everything?${params}`, {
    next: { revalidate: 900 }, // 15-min cache
  })

  if (!res.ok) {
    console.error('NewsAPI error:', res.status, await res.text())
    return { articles: [], totalResults: 0 }
  }

  const data = await res.json()

  const KEYWORDS = [
    'world cup', 'fifa', 'football', 'soccer', 'goal', 'match', 'stadium',
    'squad', 'player', 'team', 'manager', 'coach', 'injury', 'qualifier',
    'knockout', 'group stage', 'penalty', 'semifinal', 'final',
  ]

  const articles = (data.articles ?? []).filter((a: NewsArticle) => {
    if (a.title === '[Removed]' || a.url === 'https://removed.com') return false
    const text = `${a.title} ${a.description ?? ''}`.toLowerCase()
    return KEYWORDS.some((kw) => text.includes(kw))
  })

  return { articles: articles.slice(0, 20), totalResults: data.totalResults ?? 0 }
}
