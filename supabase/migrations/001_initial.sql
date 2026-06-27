-- ============================================================
-- World Cup 2026 Assistant — Initial Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- ── User profiles ────────────────────────────────────────────
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  wallet_balance numeric(12, 2) not null default 10000.00,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-create profile with $10,000 when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Bets ─────────────────────────────────────────────────────
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  odds_match_id text not null,
  home_team text not null,
  away_team text not null,
  match_date date not null,
  selection text not null check (selection in ('home', 'draw', 'away')),
  odds numeric(8, 2) not null check (odds >= 1),
  stake numeric(12, 2) not null check (stake > 0),
  status text not null default 'pending'
    check (status in ('pending', 'won', 'lost', 'void')),
  payout numeric(12, 2),
  placed_at timestamptz not null default now(),
  settled_at timestamptz
);

alter table public.bets enable row level security;

create policy "Users can read own bets"
  on public.bets for select
  using (auth.uid() = user_id);

create policy "Users can insert own bets"
  on public.bets for insert
  with check (auth.uid() = user_id);


-- ── Odds cache (no RLS — public data) ────────────────────────
create table public.odds_cache (
  match_id text not null,
  home_team text not null,
  away_team text not null,
  commence_time timestamptz not null,
  home_odds numeric(8, 2),
  draw_odds numeric(8, 2),
  away_odds numeric(8, 2),
  bookmaker text not null,
  fetched_at timestamptz not null default now(),
  primary key (match_id, bookmaker)
);


-- ── Stored procedures ─────────────────────────────────────────

-- place_bet: atomic balance deduction + bet insertion
create or replace function public.place_bet(
  p_user_id uuid,
  p_odds_match_id text,
  p_home_team text,
  p_away_team text,
  p_match_date date,
  p_selection text,
  p_odds numeric,
  p_stake numeric
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_balance numeric;
  v_bet_id uuid;
begin
  -- Lock the row and read balance
  select wallet_balance into v_balance
  from public.user_profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'User profile not found';
  end if;

  if v_balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  -- Deduct stake
  update public.user_profiles
  set wallet_balance = wallet_balance - p_stake
  where id = p_user_id;

  -- Record bet
  insert into public.bets (
    user_id, odds_match_id, home_team, away_team,
    match_date, selection, odds, stake
  )
  values (
    p_user_id, p_odds_match_id, p_home_team, p_away_team,
    p_match_date, p_selection, p_odds, p_stake
  )
  returning id into v_bet_id;

  return v_bet_id;
end;
$$;

-- settle_bet: mark bet as won/lost and credit winnings atomically
create or replace function public.settle_bet(
  p_bet_id uuid,
  p_status text,
  p_payout numeric
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Mark the bet
  update public.bets
  set
    status = p_status,
    payout = p_payout,
    settled_at = now()
  where id = p_bet_id and status = 'pending';

  -- Credit winnings to the user's wallet (0 for losses)
  if p_payout > 0 then
    update public.user_profiles up
    set wallet_balance = wallet_balance + p_payout
    from public.bets b
    where b.id = p_bet_id
      and up.id = b.user_id;
  end if;
end;
$$;
