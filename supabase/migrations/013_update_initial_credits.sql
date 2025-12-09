-- =============================================================
-- Update Initial Credits Default
-- =============================================================
-- 신규 가입 유저에게 10,000 크레딧을 기본으로 지급하도록 변경

-- 1. Table Default 변경
alter table public.credits
  alter column current_credits set default 10000;

alter table public.credits
  alter column total_earned set default 10000;

-- 2. Helper Function 업데이트 (명시적 값 주입)
create or replace function public.ensure_credit_account(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into credits (user_id, current_credits, total_earned)
  values (p_user_id, 10000, 10000)
  on conflict (user_id) do nothing;
end;
$$;
