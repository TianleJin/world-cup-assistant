import { getWorldCupNews } from '@/lib/news-api'
import type { NewsArticle } from '@/types'

export const revalidate = 900 // 15 min

export default async function NewsPage() {
  const { articles, totalResults } = await getWorldCupNews(1)

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">World Cup News</h1>
        <p className="text-sm text-slate-400">Updates every 15 minutes</p>
      </div>

      {articles.length === 0 && (
        <p className="text-slate-400">No news available right now. Check your NewsAPI key.</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a: NewsArticle) => (
          <a
            key={a.url}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 hover:bg-slate-750 transition-colors flex flex-col"
          >
            {a.urlToImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.urlToImage}
                alt=""
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4 flex flex-col flex-1 gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300">{a.source.name}</span>
                <span>
                  {new Date(a.publishedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white leading-snug line-clamp-3">
                {a.title}
              </h2>
              {a.description && (
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mt-auto">
                  {a.description}
                </p>
              )}
              <span className="text-xs text-green-500 mt-1">Read more →</span>
            </div>
          </a>
        ))}
      </div>

      {totalResults > 20 && (
        <p className="text-center text-sm text-slate-500">
          Showing 20 of {totalResults.toLocaleString()} articles
        </p>
      )}
    </div>
  )
}
