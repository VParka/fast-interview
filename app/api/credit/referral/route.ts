import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const REFERRAL_SELF_AMOUNT = Number(process.env.REFERRAL_SELF_AMOUNT ?? 20);
const REFERRAL_REFERRER_AMOUNT = Number(process.env.REFERRAL_REFERRER_AMOUNT ?? 30);

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

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { referralCode } = await req.json().catch(() => ({}));
  if (!referralCode || typeof referralCode !== 'string') {
    return NextResponse.json({ ok: false, error: '유효하지 않은 추천 코드' }, { status: 400 });
  }

  const normalizedCode = referralCode.trim().toUpperCase();

  const { data, error } = await supabase.rpc('award_referral', {
    p_referral_code: normalizedCode,
    p_friend_user_id: authData.user.id,
    p_self_amount: REFERRAL_SELF_AMOUNT,
    p_referrer_amount: REFERRAL_REFERRER_AMOUNT,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const success = Boolean(data?.success);
  const status = success ? 200 : 409;

  return NextResponse.json(
    {
      ok: success,
      error: data?.error,
      referrerId: data?.referrer_id,
      friendBalance: data?.friend_balance,
      referrerBalance: data?.referrer_balance,
    },
    { status }
  );
}

