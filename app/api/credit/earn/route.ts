import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

  const { amount, reason } = await req.json().catch(() => ({}));

  if (!Number.isInteger(amount) || amount === 0) {
    return NextResponse.json({ ok: false, error: 'amount는 0이 아닌 정수여야 합니다.' }, { status: 400 });
  }

  const safeReason = typeof reason === 'string' && reason.trim() ? reason.trim() : 'MANUAL_CREDIT';

  const { data, error } = await supabase.rpc('add_credit', {
    p_user_id: authData.user.id,
    p_amount: amount,
    p_reason: safeReason,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!data?.success) {
    return NextResponse.json({ ok: false, error: data?.error }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    balance: data?.balance,
  });
}

