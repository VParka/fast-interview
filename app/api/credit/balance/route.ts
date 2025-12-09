import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authData.user.id;

  // Ensure account row exists (initialize with 10,000 credits if new)
  await supabase
    .from('credits')
    .upsert(
      { 
        user_id: userId, 
        current_credits: 10000, 
        total_earned: 10000 
      }, 
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  const { data, error } = await supabase
    .from('credits')
    .select('current_credits, total_earned, total_used, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    balance: data?.current_credits ?? 0,
    totalEarned: data?.total_earned ?? 0,
    totalUsed: data?.total_used ?? 0,
    updatedAt: data?.updated_at ?? null,
  });
}
