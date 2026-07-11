-- Run this in Supabase SQL Editor → New query
--
-- Tags bets and cached odds with which tournament/competition they belong to,
-- so more than one tournament can have betting enabled at once (previously only
-- the World Cup did, and everything assumed that implicitly).
--
-- IMPORTANT — deployment order: this redefines place_bet() with a new required
-- parameter (p_competition). Deploy the app code that calls it with p_competition
-- (src/app/actions.ts) in the SAME release as this migration — don't run this SQL
-- ahead of that code going live, or bet placement will break in the gap (old code
-- calling the function without p_competition will fail to match any overload).

-- ── bets: tag with competition ──────────────────────────────
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS competition text NOT NULL DEFAULT 'world-cup';

-- Fix a pre-existing bug: this constraint only allowed home/draw/away, but the
-- app has emitted 'over'/'under' selections since the totals market was added.
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_selection_check;
ALTER TABLE public.bets
  ADD CONSTRAINT bets_selection_check
  CHECK (selection IN ('home', 'draw', 'away', 'over', 'under'));

-- Keep the settlement cron's per-status/competition scan fast
CREATE INDEX IF NOT EXISTS bets_status_competition_idx
  ON public.bets (status, competition);


-- ── odds_cache: tag with competition, widen the primary key ────
-- Without this, two tournaments sharing one cache table risk serving each
-- other's odds under a matching provider event id, or colliding on upsert.
ALTER TABLE public.odds_cache
  ADD COLUMN IF NOT EXISTS competition text NOT NULL DEFAULT 'world-cup';

ALTER TABLE public.odds_cache DROP CONSTRAINT IF EXISTS odds_cache_pkey;
ALTER TABLE public.odds_cache
  ADD PRIMARY KEY (competition, match_id, bookmaker);


-- ── place_bet: accept + store competition ───────────────────
-- Drop known prior overloads first so we don't leave ambiguous signatures behind.
DROP FUNCTION IF EXISTS public.place_bet(uuid, text, text, text, date, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.place_bet(uuid, text, text, text, date, timestamptz, text, numeric, numeric);

CREATE OR REPLACE FUNCTION public.place_bet(
  p_user_id uuid,
  p_odds_match_id text,
  p_home_team text,
  p_away_team text,
  p_match_date date,
  p_commence_time timestamptz,
  p_selection text,
  p_odds numeric,
  p_stake numeric,
  p_competition text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_balance numeric;
  v_bet_id uuid;
BEGIN
  SELECT wallet_balance INTO v_balance
  FROM public.user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.user_profiles
  SET wallet_balance = wallet_balance - p_stake
  WHERE id = p_user_id;

  INSERT INTO public.bets (
    user_id, odds_match_id, home_team, away_team,
    match_date, commence_time, selection, odds, stake, competition
  )
  VALUES (
    p_user_id, p_odds_match_id, p_home_team, p_away_team,
    p_match_date, p_commence_time, p_selection, p_odds, p_stake, p_competition
  )
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;
