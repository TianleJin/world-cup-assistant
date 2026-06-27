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

Competition code: `WC`, season: `2026` for football-data.org.  
Sport key env var: `ODDS_API_SPORT_KEY` (check Odds API dashboard if odds page is empty).

## Environment Variables
See `.env.local.example`. Copy to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — use **legacy** keys from Supabase Project Settings → API
- `FOOTBALL_DATA_API_TOKEN` — football-data.org account page
- `NEWS_API_KEY` — newsapi.org
- `ODDS_API_KEY` + `ODDS_API_SPORT_KEY` — the-odds-api.com
- `CRON_SECRET` — any random string; sent as `Bearer` token to `/api/settle`

## Database Schema
Run `supabase/migrations/001_initial.sql` in Supabase SQL Editor once.  
Tables: `user_profiles` (wallet_balance default $10k), `bets`, `odds_cache`.  
Key RPCs: `place_bet()` (atomic deduction + insert), `settle_bet()` (marks won/lost + credits wallet).

## Key Architecture Decisions
- All external API calls go through server-side lib functions — never from the client
- Pages are Server Components with `revalidate` for caching; only `/account`, `/odds`, `/bet/[matchId]` are `force-dynamic`
- Stage labels on odds page use date-based inference (team name matching between Odds API and football-data.org is unreliable)
- Draw odds shown only when Sportsbet provides them (`odds.draw_odds` truthy)
- Flags served from `flagcdn.com` via team name → ISO 3166-1 alpha-2 mapping in `src/lib/flags.ts`
- Bet settlement runs via Vercel Cron (`/api/settle` every 10 min) — matches bets to results by team name + date fuzzy matching in `src/lib/team-utils.ts`
- Auth: `window.location.href = '/'` after login/register (not `router.push`) to ensure server components re-render with fresh session

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
    nav.tsx / nav-auth.tsx
    match-card.tsx
    bet-form.tsx           # Client component with useActionState
  lib/
    supabase/client.ts + server.ts + admin.ts
    football-data.ts
    news-api.ts
    odds-api.ts            # Checks Supabase cache before calling API
    flags.ts               # Team name → flagcdn.com URL
    team-utils.ts          # normalizeTeamName, teamsMatch (null-safe)
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
- Disable "Confirm email" under Authentication → Providers → Email for easier local testing
- `user_profiles` and `bets` have RLS; `odds_cache` does not (public data)
