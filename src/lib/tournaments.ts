// Registry of every tournament the app hosts. This is the single source of truth
// for tournament identity — the data layer, routing, and nav all read from here
// instead of hardcoding competition codes / seasons / query strings.
//
// Plain data only (no server-only imports) so it can be imported from both
// Server and Client Components.

export interface Tournament {
  /** URL segment, e.g. 'world-cup', 'premier-league' */
  slug: string
  /** Full display name, e.g. 'FIFA World Cup 2026' */
  name: string
  /** Short name for the nav switcher, e.g. 'World Cup' */
  shortName: string
  /** Dashboard hero subtitle, e.g. 'USA · Canada · Mexico' */
  subtitle?: string
  /** football-data.org competition code, e.g. 'WC', 'PL' */
  competitionCode: string
  /** football-data.org season start year, e.g. '2026' */
  season: string
  /** cup → group tables + knockout bracket; league → single table */
  format: 'cup' | 'league'
  /** national → country flags (flags.ts); club → team crest from the API */
  teamType: 'national' | 'club'
  /** Heading + nav label for the standings section, e.g. 'Bracket' vs 'Table' */
  standingsLabel: string
  /**
   * NewsAPI query + post-filter.
   * - keywords: article kept only if its title/description contains at least one.
   * - exclude: article dropped if its title/description contains any of these
   *   (whole-word match). Used to reject wrong-sport uses of an ambiguous name,
   *   e.g. "Premier League" also matches the Indian Premier League (cricket).
   */
  news: { query: string; keywords: string[]; exclude?: string[] }
  /** Whether odds/betting is enabled for this tournament */
  betting: boolean
  /** The Odds API sport key — only present when betting is enabled */
  oddsSportKey?: string
  /** YouTube playlist of highlight clips — only where one exists */
  youtubePlaylistId?: string
}

const worldCup: Tournament = {
  slug: 'world-cup',
  name: 'FIFA World Cup 2026',
  shortName: 'World Cup',
  subtitle: 'USA · Canada · Mexico',
  competitionCode: 'WC',
  season: '2026',
  format: 'cup',
  teamType: 'national',
  standingsLabel: 'Bracket',
  news: {
    query:
      '"FIFA World Cup 2026" OR ("World Cup 2026" AND (soccer OR football OR FIFA OR goal OR match))',
    keywords: [
      'world cup', 'fifa', 'football', 'soccer', 'goal', 'match', 'stadium',
      'squad', 'player', 'team', 'manager', 'coach', 'injury', 'qualifier',
      'knockout', 'group stage', 'penalty', 'semifinal', 'final',
    ],
    // "World Cup" also names cricket/rugby tournaments — reject those.
    exclude: [
      'cricket', 'ipl', 'bbl', 'big bash', 'wicket', 'batsman', 'bowler',
      't20', 'odi', 'rugby', 'nrl', 'netball',
    ],
  },
  betting: true,
  oddsSportKey: process.env.ODDS_API_SPORT_KEY ?? 'soccer_fifa_world_cup',
  youtubePlaylistId: 'PLNuJDkj3zBvPVhoKC6Oq8j4w7AH9l-ejG',
}

const premierLeague: Tournament = {
  slug: 'premier-league',
  name: 'Premier League',
  shortName: 'Premier League',
  subtitle: 'England · 2026/27',
  competitionCode: 'PL',
  season: '2026',
  format: 'league',
  teamType: 'club',
  standingsLabel: 'Table',
  news: {
    // Anchor to football and exclude the Indian Premier League (cricket) at source.
    query:
      '"Premier League" AND (football OR soccer OR EPL) AND NOT (cricket OR IPL)',
    keywords: [
      'premier league', 'football', 'soccer', 'goal', 'fixture',
      'manager', 'injury', 'transfer', 'penalty', 'striker', 'goalkeeper',
      'midfielder', 'defender', 'derby', 'title race', 'relegation',
      'anfield', 'etihad', 'old trafford', 'stamford bridge',
    ],
    // "Premier League" also names cricket (IPL), darts, rugby, netball leagues.
    exclude: [
      'cricket', 'ipl', 'indian premier league', 'bbl', 'big bash', 'wicket',
      'batsman', 'bowler', 't20', 'odi', 'test match', 'darts', 'netball',
      'rugby', 'nrl', 'basketball', 'nba', 'baseball', 'mlb',
    ],
  },
  betting: false,
}

export const TOURNAMENTS: Tournament[] = [worldCup, premierLeague]

export const DEFAULT_TOURNAMENT_SLUG = 'world-cup'

export function getTournament(slug: string): Tournament | undefined {
  return TOURNAMENTS.find((t) => t.slug === slug)
}
