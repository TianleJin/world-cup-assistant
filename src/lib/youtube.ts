import { normalizeTeamName } from '@/lib/team-utils'

const PLAYLIST_ID = 'PLNuJDkj3zBvPVhoKC6Oq8j4w7AH9l-ejG'

export interface YouTubeClip {
  id: string
  title: string
  thumbnailUrl: string
  url: string
}

export async function getFifaChannelVideos(): Promise<YouTubeClip[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  const clips: YouTubeClip[] = []
  let pageToken: string | undefined

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('playlistId', PLAYLIST_ID)
    url.searchParams.set('maxResults', '50')
    url.searchParams.set('key', apiKey)
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url.toString(), { next: { revalidate: 900 } })
    if (!res.ok) break

    const data = await res.json()
    for (const item of data.items ?? []) {
      const snippet = item.snippet
      const videoId = snippet?.resourceId?.videoId
      const title = snippet?.title
      if (!videoId || !title) continue
      clips.push({
        id: videoId,
        title,
        thumbnailUrl: snippet.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken)

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
