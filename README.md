# World Cup 2026 Assistant

Live scores, standings, fixtures, news, match highlights, and a fake-money betting simulation for the FIFA World Cup 2026 and the Premier League.

Users register, get a virtual $10,000 wallet, and place bets on real bookmaker odds. Bets are settled automatically against real results. No real money is involved.

## Features

- **Multiple tournaments**: World Cup 2026 and Premier League, switchable from the nav (defined in `src/lib/tournaments.ts`)
- **Live dashboard**: live, today, tomorrow, and recent matches
- **Standings**: group tables and knockout bracket (cup) or a single table (league)
- **Results and schedule**: grouped by local date and timezone
- **News**: filtered NewsAPI articles per tournament
- **Highlights**: FIFA channel clips matched to fixtures by team name
- **Betting simulation**: head-to-head odds from Sportsbet, atomic bet placement, automatic settlement
- **Accounts**: Supabase Auth with email confirmation, password change, account deletion

## Tech stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v3
- Supabase (PostgreSQL + Auth)
- Hosting: Vercel + Supabase, both on free tiers

## Data sources

All external calls are made server-side.

| Source | Used for | Cache |
|---|---|---|
| [football-data.org](https://www.football-data.org) | Scores, standings, fixtures, scorers | 60s to 300s (Next.js fetch) |
| [NewsAPI](https://newsapi.org) | News articles | 15 min (Next.js fetch) |
| [The Odds API](https://the-odds-api.com) | Sportsbet h2h odds | 6 hours (Supabase `odds_cache` table) |
| [YouTube Data API v3](https://developers.google.com/youtube/v3) | Highlight clips | 15 min (Next.js fetch) |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Set up Supabase

1. Create a Supabase project.
2. In the SQL Editor, run the migrations in `supabase/migrations/` in order (`001_initial.sql`, `002_bet_commence_time.sql`, `003_bet_competition.sql`).
3. Leave "Auto-expose new tables" ticked. Access control is done with RLS.
4. Optional: turn off "Confirm email" (Authentication, Providers, Email) for frictionless local testing.

### 3. Configure environment

Copy `.env.local.example` to `.env.local` and fill it in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase, Project Settings, API (use the **legacy** keys) |
| `FOOTBALL_DATA_API_TOKEN` | football-data.org account page |
| `NEWS_API_KEY` | newsapi.org |
| `ODDS_API_KEY`, `ODDS_API_SPORT_KEY` | the-odds-api.com (check the dashboard for the World Cup sport key) |
| `YOUTUBE_API_KEY` | Google Cloud Console. Optional: highlights are skipped if unset |
| `CRON_SECRET` | Any random string. Sent as a `Bearer` token to `/api/settle` |

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |

## Bet settlement

A Vercel Cron job (configured in `vercel.json`) calls `/api/settle` with `Authorization: Bearer $CRON_SECRET`. It matches pending bets to finished matches by team name and date, then calls the `settle_bet()` RPC, which marks the bet won or lost and credits the wallet. Bets still pending more than 2 days after their match date log a warning in the Vercel function logs.

To test settlement locally, temporarily remove the auth header check in `src/app/api/settle/route.ts` and visit http://localhost:3000/api/settle.

## Project structure

```
src/
  app/                  # Routes (tournament-scoped pages, auth, server actions, /api/settle)
  components/           # Nav, match cards, bet form, client-side time helpers
  lib/                  # API clients, Supabase clients, team-name matching, flags, tournaments
  types/
supabase/migrations/    # SQL schema and RPCs (place_bet, settle_bet)
```

Team names differ between football-data.org, The Odds API, and YouTube titles, so `src/lib/team-utils.ts` normalizes and fuzzy-matches them.

## Deployment

Deploy to Vercel and set the same environment variables in the project settings. Vercel Cron will pick up `vercel.json` automatically.

## Contributing notes

See [CLAUDE.md](CLAUDE.md) for architecture decisions and conventions (caching strategy, color scheme, auth flow).
