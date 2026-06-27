import { normalizeTeamName } from '@/lib/team-utils'

const PLAYLIST_ID = 'PLBRLtDhTHh5o'

export interface YouTubeClip {
  id: string
  title: string
  thumbnailUrl: string
  url: string
}

export async function getFifaChannelVideos(): Promise<YouTubeClip[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`,
    { next: { revalidate: 900 } }
  )
  if (!res.ok) return []

  const xml = await res.text()
  const clips: YouTubeClip[] = []

  for (const entry of xml.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
    const title = entry.match(/<media:title>([^<]+)<\/media:title>/)?.[1]
    const thumbnail = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1]
    if (id && title) {
      clips.push({
        id,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        thumbnailUrl: thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
      })
    }
  }

  return clips
}

export function findMatchClips(
  clips: YouTubeClip[],
  homeTeam: string,
  awayTeam: string
): YouTubeClip[] {
  const homeParts = normalizeTeamName(homeTeam).split(' ').filter(Boolean)
  const awayParts = normalizeTeamName(awayTeam).split(' ').filter(Boolean)

  return clips.filter((clip) => {
    const t = normalizeTeamName(clip.title)
    const hasHome = homeParts.every((w) => t.includes(w))
    const hasAway = awayParts.every((w) => t.includes(w))
    return hasHome && hasAway
  })
}
