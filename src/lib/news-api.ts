import type { NewsArticle } from '@/types'
import type { Tournament } from '@/lib/tournaments'

const BASE = 'https://newsapi.org/v2'

export async function getNews(
  t: Tournament,
  page = 1
): Promise<{ articles: NewsArticle[]; totalResults: number }> {
  const params = new URLSearchParams({
    q: t.news.query,
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

  const keywords = t.news.keywords
  const exclude = t.news.exclude ?? []
  // Whole-word matcher so short blocklist tokens (ipl, odi, t20) don't match
  // inside unrelated words like "multiple" or "podium".
  const excludeRe = exclude.length
    ? new RegExp(`\\b(${exclude.map(escapeRegExp).join('|')})\\b`, 'i')
    : null

  const articles = (data.articles ?? []).filter((a: NewsArticle) => {
    if (a.title === '[Removed]' || a.url === 'https://removed.com') return false
    const text = `${a.title} ${a.description ?? ''}`.toLowerCase()
    if (excludeRe && excludeRe.test(text)) return false
    return keywords.some((kw) => text.includes(kw))
  })

  return { articles: articles.slice(0, 20), totalResults: data.totalResults ?? 0 }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
