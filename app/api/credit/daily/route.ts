import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const DAILY_REWARD_AMOUNT = Number(process.env.DAILY_REWARD_AMOUNT ?? 10);
const DAILY_MIN_INTERVAL_HOURS = Number(process.env.DAILY_REWARD_INTERVAL_HOURS ?? 24);

function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('award_daily_login', {
    p_user_id: authData.user.id,
    p_amount: DAILY_REWARD_AMOUNT,
    p_min_interval_hours: DAILY_MIN_INTERVAL_HOURS,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const success = Boolean(data?.success);
  const status = success ? 200 : 409;

  return NextResponse.json(
    {
      ok: success,
      rewardGiven: data?.awarded ?? false,
      balance: data?.balance,
      nextEligibleAt: data?.next_eligible_at,
      error: data?.error,
    },
    { status }
  );
}

