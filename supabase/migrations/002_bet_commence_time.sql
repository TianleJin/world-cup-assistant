-- Run this in Supabase SQL Editor → New query

-- Add commence_time to bets so we can check if a match has started
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS commence_time timestamptz;

-- Update place_bet to accept and store commence_time
CREATE OR REPLACE FUNCTION public.place_bet(
  p_user_id uuid,
  p_odds_match_id text,
  p_home_team text,
  p_away_team text,
  p_match_date date,
  p_commence_time timestamptz,
  p_selection text,
  p_odds numeric,
  p_stake numeric
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
    match_date, commence_time, selection, odds, stake
  )
  VALUES (
    p_user_id, p_odds_match_id, p_home_team, p_away_team,
    p_match_date, p_commence_time, p_selection, p_odds, p_stake
  )
  RETURNING id INTO v_bet_id;

  RETURN v_bet_id;
END;
$$;

-- Cancel bet: refund stake if match hasn't started yet
CREATE OR REPLACE FUNCTION public.cancel_bet(
  p_bet_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_stake numeric;
  v_commence_time timestamptz;
BEGIN
  SELECT stake, commence_time INTO v_stake, v_commence_time
  FROM public.bets
  WHERE id = p_bet_id
    AND user_id = p_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found or already settled';
  END IF;

  IF v_commence_time IS NOT NULL AND v_commence_time <= now() THEN
    RAISE EXCEPTION 'Match has already started';
  END IF;

  UPDATE public.bets
  SET status = 'void', payout = v_stake, settled_at = now()
  WHERE id = p_bet_id;

  UPDATE public.user_profiles
  SET wallet_balance = wallet_balance + v_stake
  WHERE id = p_user_id;
END;
$$;
