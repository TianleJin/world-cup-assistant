export interface Team {
  id: number | null
  name: string | null
  shortName: string | null
  crest: string | null
}

export interface Match {
  id: number
  utcDate: string
  status: 'TIMED' | 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'
  matchday: number | null
  stage: string
  group: string | null
  homeTeam: Team
  awayTeam: Team
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    duration?: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
    regularTime?: { home: number | null; away: number | null }
    extraTime?: { home: number | null; away: number | null }
    penalties?: { home: number | null; away: number | null }
  }
}

export interface StandingRow {
  position: number
  team: Team
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export interface Standing {
  stage: string
  type: string
  group: string | null
  table: StandingRow[]
}

export interface NewsArticle {
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  source: { id: string | null; name: string }
}

export interface OddsRow {
  id?: string
  competition: string
  match_id: string
  home_team: string
  away_team: string
  commence_time: string
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null
  over_odds: number | null
  under_odds: number | null
  bookmaker: string
  fetched_at: string
}

export interface Bet {
  id: string
  user_id: string
  competition: string
  odds_match_id: string
  home_team: string
  away_team: string
  match_date: string
  selection: 'home' | 'draw' | 'away' | 'over' | 'under'
  odds: number
  stake: number
  status: 'pending' | 'won' | 'lost' | 'void'
  payout: number | null
  commence_time: string | null
  placed_at: string
  settled_at: string | null
}

export interface UserProfile {
  id: string
  wallet_balance: number
  created_at: string
}
