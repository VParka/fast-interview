import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const REFERRAL_SELF_AMOUNT = Number(process.env.REFERRAL_SELF_AMOUNT ?? 20);
const REFERRAL_REFERRER_AMOUNT = Number(process.env.REFERRAL_REFERRER_AMOUNT ?? 30);

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { code } = body;

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ ok: false, error: 'Referral code is required' }, { status: 400 });
  }

  // 본인 코드 입력 방지 등은 RPC 내부에서 처리하거나 여기서 체크
  // 여기서는 RPC를 호출한다고 가정 (apply_referral)
  const { data, error } = await supabase.rpc('apply_referral', {
    p_user_id: authData.user.id,
    p_code: code,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!data?.success) {
    return NextResponse.json({ ok: false, error: data?.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    reward: data.reward,
    balance: data.balance,
  });
}
