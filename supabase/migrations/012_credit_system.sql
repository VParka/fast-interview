-- =============================================================
-- Credit System: tables, RLS, and RPC functions
-- =============================================================
-- 요구사항:
-- - credits, referral, daily_login_log, credit_transactions 테이블
-- - RLS 및 보안 정책
-- - 일일 보상, 추천 보상, 임의 지급, 차감 RPC
-- - 트랜잭션/락을 통한 동시성 안전성 확보

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Tables
-- -------------------------------------------------------------
create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  current_credits int not null default 0 check (current_credits >= 0),
  total_earned int not null default 0 check (total_earned >= 0),
  total_used int not null default 0 check (total_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.referral (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  referral_code varchar(12) not null,
  referred_by uuid references auth.users (id),
  referred_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referral_user_unique unique (user_id),
  constraint referral_code_unique unique (referral_code)
);

create table if not exists public.daily_login_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  rewarded_at timestamptz not null default now(),
  reward_date date not null default (now()::date),
  constraint daily_login_unique_per_day unique (user_id, reward_date)
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  amount int not null,
  reason varchar(255) not null,
  balance_after int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------
create unique index if not exists idx_credits_user on public.credits (user_id);
create unique index if not exists idx_referral_code on public.referral (referral_code);
create unique index if not exists idx_referral_user on public.referral (user_id);
create index if not exists idx_loginlog_user on public.daily_login_log (user_id);
create index if not exists idx_transactions_user on public.credit_transactions (user_id);

-- -------------------------------------------------------------
-- RLS Policies
-- -------------------------------------------------------------
alter table public.credits enable row level security;
drop policy if exists p_credits_select on public.credits;
drop policy if exists p_credits_update on public.credits;
drop policy if exists p_credits_insert on public.credits;
create policy p_credits_select
  on public.credits
  for select
  using (auth.uid() = user_id);
create policy p_credits_update
  on public.credits
  for update
  using (auth.uid() = user_id);
create policy p_credits_insert
  on public.credits
  for insert
  with check (auth.uid() = user_id);

alter table public.referral enable row level security;
drop policy if exists p_referral_select on public.referral;
drop policy if exists p_referral_insert on public.referral;
drop policy if exists p_referral_update on public.referral;
create policy p_referral_select
  on public.referral
  for select
  using (auth.uid() = user_id or auth.uid() = referred_by);
create policy p_referral_insert
  on public.referral
  for insert
  with check (auth.uid() = user_id);
create policy p_referral_update
  on public.referral
  for update
  using (auth.uid() = user_id);

alter table public.daily_login_log enable row level security;
drop policy if exists p_loginlog_select on public.daily_login_log;
drop policy if exists p_loginlog_insert on public.daily_login_log;
create policy p_loginlog_select
  on public.daily_login_log
  for select
  using (auth.uid() = user_id);
create policy p_loginlog_insert
  on public.daily_login_log
  for insert
  with check (auth.uid() = user_id);

alter table public.credit_transactions enable row level security;
drop policy if exists p_transactions_select on public.credit_transactions;
drop policy if exists p_transactions_insert on public.credit_transactions;
create policy p_transactions_select
  on public.credit_transactions
  for select
  using (auth.uid() = user_id);
create policy p_transactions_insert
  on public.credit_transactions
  for insert
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------
-- Helper functions
-- -------------------------------------------------------------

-- 랜덤 추천 코드 생성 (대문자/숫자 8자리 기본)
create or replace function public.generate_referral_code(p_length int default 8)
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
begin
  if p_length < 4 then
    raise exception 'referral code length too short';
  end if;

  for i in 1..p_length loop
    result := result || substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1);
  end loop;

  return result;
end;
$$;

-- referral row 보장
create or replace function public.ensure_referral_profile(p_user_id uuid)
returns void
language plpgsql
as $$
declare
  tmp_code text;
  attempt int := 0;
begin
  if exists (select 1 from referral where user_id = p_user_id) then
    return;
  end if;

  loop
    attempt := attempt + 1;
    tmp_code := generate_referral_code(8);
    begin
      insert into referral (user_id, referral_code)
      values (p_user_id, tmp_code);
      exit;
    exception
      when unique_violation then
        if attempt > 5 then
          raise exception 'failed to generate unique referral code';
        end if;
        -- retry
    end;
  end loop;
end;
$$;

-- credits row 보장
create or replace function public.ensure_credit_account(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into credits (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

-- -------------------------------------------------------------
-- RPC: 일일 로그인 보상
-- -------------------------------------------------------------
create or replace function public.award_daily_login(
  p_user_id uuid,
  p_amount int default 10,
  p_min_interval_hours int default 24
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  last_rewarded timestamptz;
  next_eligible timestamptz;
  new_balance int;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  perform ensure_credit_account(p_user_id);
  perform ensure_referral_profile(p_user_id);

  select max(rewarded_at) into last_rewarded
  from daily_login_log
  where user_id = p_user_id;

  if last_rewarded is not null then
    next_eligible := last_rewarded + (p_min_interval_hours || ' hour')::interval;
    if now() < next_eligible then
      return jsonb_build_object(
        'success', false,
        'error', 'already_claimed',
        'next_eligible_at', next_eligible
      );
    end if;
  end if;

  -- 락 및 업데이트
  select current_credits
  into new_balance
  from credits
  where user_id = p_user_id
  for update;

  update credits
  set current_credits = current_credits + p_amount,
      total_earned    = total_earned + GREATEST(p_amount, 0),
      updated_at      = now()
  where user_id = p_user_id
  returning current_credits into new_balance;

  insert into daily_login_log(user_id, rewarded_at)
  values (p_user_id, now());

  insert into credit_transactions(user_id, amount, reason, balance_after, meta)
  values (p_user_id, p_amount, 'DAILY_LOGIN', new_balance, jsonb_build_object('interval_hours', p_min_interval_hours));

  return jsonb_build_object(
    'success', true,
    'awarded', true,
    'balance', new_balance
  );
end;
$$;

-- -------------------------------------------------------------
-- RPC: 추천 보상
-- -------------------------------------------------------------
create or replace function public.award_referral(
  p_referral_code text,
  p_friend_user_id uuid,
  p_self_amount int default 20,
  p_referrer_amount int default 30
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_id uuid;
  existing_referrer uuid;
  friend_balance int;
  referrer_balance int;
begin
  if auth.uid() is distinct from p_friend_user_id then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  select user_id into referrer_id
  from referral
  where referral_code = p_referral_code;

  if referrer_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;

  if referrer_id = p_friend_user_id then
    return jsonb_build_object('success', false, 'error', 'self_referral');
  end if;

  perform ensure_referral_profile(p_friend_user_id);
  perform ensure_referral_profile(referrer_id);
  perform ensure_credit_account(p_friend_user_id);
  perform ensure_credit_account(referrer_id);

  select referred_by into existing_referrer
  from referral
  where user_id = p_friend_user_id
  for update;

  if existing_referrer is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'already_referred',
      'referrer_id', existing_referrer
    );
  end if;

  update referral
  set referred_by = referrer_id,
      referred_at = now()
  where user_id = p_friend_user_id;

  -- 친구 보상
  select current_credits into friend_balance
  from credits
  where user_id = p_friend_user_id
  for update;

  update credits
  set current_credits = current_credits + p_self_amount,
      total_earned    = total_earned + GREATEST(p_self_amount, 0),
      updated_at      = now()
  where user_id = p_friend_user_id
  returning current_credits into friend_balance;

  insert into credit_transactions(user_id, amount, reason, balance_after, meta)
  values (
    p_friend_user_id,
    p_self_amount,
    'REFERRAL_SELF',
    friend_balance,
    jsonb_build_object('referrer_id', referrer_id, 'referral_code', p_referral_code)
  );

  -- 추천인 보상
  select current_credits into referrer_balance
  from credits
  where user_id = referrer_id
  for update;

  update credits
  set current_credits = current_credits + p_referrer_amount,
      total_earned    = total_earned + GREATEST(p_referrer_amount, 0),
      updated_at      = now()
  where user_id = referrer_id
  returning current_credits into referrer_balance;

  insert into credit_transactions(user_id, amount, reason, balance_after, meta)
  values (
    referrer_id,
    p_referrer_amount,
    'REFERRAL_FRIEND',
    referrer_balance,
    jsonb_build_object('friend_user_id', p_friend_user_id, 'referral_code', p_referral_code)
  );

  return jsonb_build_object(
    'success', true,
    'referrer_id', referrer_id,
    'friend_balance', friend_balance,
    'referrer_balance', referrer_balance
  );
end;
$$;

-- -------------------------------------------------------------
-- RPC: 임의 지급
-- -------------------------------------------------------------
create or replace function public.add_credit(
  p_user_id uuid,
  p_amount int,
  p_reason text default 'MANUAL_CREDIT'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  if p_amount = 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  perform ensure_credit_account(p_user_id);

  select current_credits
  into new_balance
  from credits
  where user_id = p_user_id
  for update;

  update credits
  set current_credits = current_credits + p_amount,
      total_earned    = total_earned + GREATEST(p_amount, 0),
      updated_at      = now()
  where user_id = p_user_id
  returning current_credits into new_balance;

  insert into credit_transactions(user_id, amount, reason, balance_after)
  values (p_user_id, p_amount, coalesce(p_reason, 'MANUAL_CREDIT'), new_balance);

  return jsonb_build_object(
    'success', true,
    'balance', new_balance
  );
end;
$$;

-- -------------------------------------------------------------
-- RPC: 사용/차감 (잔액 부족 시 실패)
-- -------------------------------------------------------------
create or replace function public.use_credit(
  p_user_id uuid,
  p_amount int,
  p_reason text default 'AI_USE'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_balance int;
  new_balance int;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  if p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  perform ensure_credit_account(p_user_id);

  select current_credits
  into cur_balance
  from credits
  where user_id = p_user_id
  for update;

  if cur_balance < p_amount then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_funds',
      'balance', cur_balance
    );
  end if;

  update credits
  set current_credits = current_credits - p_amount,
      total_used      = total_used + p_amount,
      updated_at      = now()
  where user_id = p_user_id
  returning current_credits into new_balance;

  insert into credit_transactions(user_id, amount, reason, balance_after)
  values (p_user_id, -p_amount, coalesce(p_reason, 'AI_USE'), new_balance);

  return jsonb_build_object(
    'success', true,
    'balance', new_balance
  );
end;
$$;

-- -------------------------------------------------------------
-- Grants: allow authenticated users to call RPCs
-- -------------------------------------------------------------
grant execute on function award_daily_login(uuid, int, int) to authenticated;
grant execute on function award_referral(text, uuid, int, int) to authenticated;
grant execute on function add_credit(uuid, int, text) to authenticated;
grant execute on function use_credit(uuid, int, text) to authenticated;
grant execute on function ensure_referral_profile(uuid) to authenticated;
grant execute on function ensure_credit_account(uuid) to authenticated;

