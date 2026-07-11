# World Cup 2026 Assistant

Live scores, standings, news, and fake-money betting simulation for FIFA World Cup 2026.

## Tech Stack
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Auth + DB**: Supabase (PostgreSQL + Supabase Auth)
- **Styling**: Tailwind CSS v3
- **Deployment**: Vercel (free) + Supabase (free)

## Data Sources (all free tier)
| Source | Used for | Cache |
|---|---|---|
| football-data.org | Scores, standings, fixtures, scorers | 60s–300s via Next.js fetch |
| NewsAPI | World Cup news articles | 15 min via Next.js fetch |
| The Odds API | Sportsbet h2h odds | 6 hours via Supabase `odds_cache` table |
| YouTube Data API v3 | FIFA channel highlight clips (matched to fixtures by team name) | 15 min via Next.js fetch |

Competition code: `WC`, season: `2026` for football-data.org.  
Sport key env var: `ODDS_API_SPORT_KEY` (check Odds API dashboard if odds page is empty).  
YouTube clips are pulled from a single hard-coded FIFA playlist ID in `src/lib/youtube.ts` and matched to fixtures via `normalizeTeamName()` against the video title.

## Environment Variables
See `.env.local.example`. Copy to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — use **legacy** keys from Supabase Project Settings → API
- `FOOTBALL_DATA_API_TOKEN` — football-data.org account page
- `NEWS_API_KEY` — newsapi.org
- `ODDS_API_KEY` + `ODDS_API_SPORT_KEY` — the-odds-api.com
- `YOUTUBE_API_KEY` — Google Cloud Console (YouTube Data API v3 enabled); optional, highlight clips are skipped silently if unset
- `CRON_SECRET` — any random string; sent as `Bearer` token to `/api/settle`

## Database Schema
Run `supabase/migrations/001_initial.sql` in Supabase SQL Editor once.  
Tables: `user_profiles` (wallet_balance default $10k), `bets`, `odds_cache`.  
Key RPCs: `place_bet()` (atomic deduction + insert), `settle_bet()` (marks won/lost + credits wallet).

## Key Architecture Decisions
- All external API calls go through server-side lib functions — never from the client
- Pages are Server Components with `revalidate` for caching; `/`, `/account`, `/odds`, `/bet/[matchId]` are `force-dynamic` (all four need per-request Supabase session/balance reads)
- Team name matching (`src/lib/team-utils.ts` — `normalizeTeamName()` + `teamsMatch()`) reconciles naming differences between football-data.org, The Odds API, and YouTube video titles (e.g. `"Bosnia-Herzegovina"` vs `"Bosnia & Herzegovina"`). Hyphens/ampersands/apostrophes are normalized to spaces (not stripped) so multi-word names don't get glued together, and filler word "and" is removed. Verified against all 49 WC 2026 teams as of 2026-07 — if a future team pairing still fails to match, `/api/settle` logs a `console.warn` (see below) rather than failing silently.
- Stage labels on the odds page match fixtures via date + `teamsMatch()` (`findFixture()` in `src/app/odds/page.tsx`)
- Draw odds shown only when Sportsbet provides them (`odds.draw_odds` truthy)
- Flags served from `flagcdn.com` via team name → ISO 3166-1 alpha-2 mapping in `src/lib/flags.ts`
- Bet settlement runs via Vercel Cron (`/api/settle` every 10 min) — matches bets to results by team name + date fuzzy matching. If a pending bet's `match_date` is >2 days past with no matching finished match, it logs a warning instead of continuing to fail silently — check Vercel function logs if a user reports a bet stuck pending
- After a successful bet, `placeBetAction` redirects to `/odds` (not back to `/bet/[matchId]`)
- Auth: `window.location.href = '/'` after login/register (not `router.push`) to ensure server components re-render with fresh session
- Color scheme is "Trophy Gold" — amber (`amber-400`/`amber-600`) is the primary UI accent (nav, buttons, links, borders, stage pills). Green is reserved semantically for positive outcomes only: winning team scores (`bold` in `TeamRow`) and `won` bet status/payout — don't reintroduce green as a general accent

## Project Structure
```
src/
  app/
    page.tsx               # Dashboard
    standings/page.tsx
    results/page.tsx
    schedule/page.tsx
    news/page.tsx
    odds/page.tsx
    bet/[matchId]/page.tsx # matchId = Odds API event ID
    account/page.tsx
    login/page.tsx
    register/page.tsx
    actions.ts             # placeBetAction server action
    auth/callback/route.ts
    api/settle/route.ts    # Vercel Cron bet settlement
  components/
    nav.tsx                # Async server component — reads Supabase session
    nav-auth.tsx           # Client — sign out, balance pill
    nav-links.tsx          # Client — desktop/mobile nav links (usePathname active state)
    match-card.tsx         # Stage/status pills, team rows, highlights, bet link
    match-day-list.tsx     # Client — groups matches by local date w/ date separators
    home-match-section.tsx # Client — splits matches into Live/Today/Tomorrow/Recent
    bet-form.tsx           # Client component with useActionState
    local-time.tsx         # Client — renders UTC ISO in local timezone (avoids hydration mismatch)
    timezone-label.tsx     # Client — shows tz abbreviation, e.g. (AEST)
    success-banner.tsx     # Renders ?success= query param messages
    settings-section.tsx   # Change password / delete account forms
  lib/
    supabase/client.ts + server.ts + admin.ts
    football-data.ts
    news-api.ts
    odds-api.ts            # Checks Supabase cache before calling API
    youtube.ts             # FIFA channel highlight clips, matched by team name
    flags.ts               # Team name → flagcdn.com URL
    team-utils.ts          # normalizeTeamName, teamsMatch (null-safe, punctuation-aware)
  types/index.ts
```

## Running Locally
```
npm install
npm run dev   # http://localhost:3000
```

To test bet settlement manually, temporarily remove the auth header check in `src/app/api/settle/route.ts` and visit `http://localhost:3000/api/settle`.

## Supabase Setup Notes
- Enable "Auto-expose new tables" (ticked) — we use RLS for access control
- "Confirm email" under Authentication → Providers → Email is **enabled** (real users are registering). Emails send via Supabase's default sender — fine for this project's scale, no custom SMTP needed. Toggle it off temporarily if you need frictionless local testing.
- `user_profiles` and `bets` have RLS; `odds_cache` does not (public data)
