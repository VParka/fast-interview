import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const DEFAULT_REASON = 'AI_USE';

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

  const { amount, type } = await req.json().catch(() => ({}));

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: 'amount는 양의 정수여야 합니다.' }, { status: 400 });
  }

  const reason = typeof type === 'string' && type.trim() ? type.trim() : DEFAULT_REASON;

  const { data, error } = await supabase.rpc('use_credit', {
    p_user_id: authData.user.id,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!data?.success) {
    const status = data?.error === 'insufficient_funds' ? 402 : 409;
    return NextResponse.json(
      { ok: false, error: data?.error, balance: data?.balance },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    balance: data?.balance,
  });
}

