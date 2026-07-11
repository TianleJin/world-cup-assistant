import type { NextConfig } from 'next'

// The World Cup used to live at the site root (/standings, /odds, …). Those routes
// now live under /world-cup/*. Redirect the old paths so existing bookmarks keep working.
const WC_PATHS = ['standings', 'results', 'schedule', 'news', 'odds']

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...WC_PATHS.map((p) => ({
        source: `/${p}`,
        destination: `/world-cup/${p}`,
        permanent: true,
      })),
      {
        source: '/bet/:matchId',
        destination: '/world-cup/bet/:matchId',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
