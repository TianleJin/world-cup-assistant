import { normalizeTeamName } from '@/lib/team-utils'

export interface YouTubeClip {
  id: string
  title: string
  thumbnailUrl: string
  url: string
}

// Fetch highlight clips from a tournament's YouTube playlist. Tournaments without
// a playlist (playlistId undefined) get no highlights — callers should skip the call.
export async function getPlaylistVideos(playlistId: string | undefined): Promise<YouTubeClip[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey || !playlistId) return []

  const clips: YouTubeClip[] = []
  let pageToken: string | undefined

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('playlistId', playlistId)
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
  homeTeam: string | null,
  awayTeam: string | null
): YouTubeClip[] {
  if (!homeTeam || !awayTeam) return []
  const homeParts = normalizeTeamName(homeTeam).split(' ').filter(Boolean)
  const awayParts = normalizeTeamName(awayTeam).split(' ').filter(Boolean)

  return clips.filter((clip) => {
    const t = normalizeTeamName(clip.title)
    const hasHome = homeParts.every((w) => t.includes(w))
    const hasAway = awayParts.every((w) => t.includes(w))
    return hasHome && hasAway
  })
}
