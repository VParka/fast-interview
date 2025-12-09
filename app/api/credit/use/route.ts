import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const DEFAULT_REASON = 'AI_USE';

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
  const { amount, reason, meta } = body;

  const validAmount = Number(amount);
  if (!validAmount || validAmount <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
  }

  // RPC 호출
  const { data, error } = await supabase.rpc('use_credit', {
    p_user_id: authData.user.id,
    p_amount: validAmount,
    p_reason: reason || 'API Usage',
    p_meta: meta || {},
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!data?.success) {
    const isInsufficient = data?.error === 'insufficient_funds';
    return NextResponse.json(
      { ok: false, error: data?.error },
      { status: isInsufficient ? 402 : 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    balance: data.balance,
    transactionId: data.transaction_id,
  });
}
