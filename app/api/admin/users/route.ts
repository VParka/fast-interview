import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Admin 전용 API: 전체 유저 목록 조회
 * Service Role Key를 사용하여 RLS 우회
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Service Role Key로 RLS 우회
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 전체 유저 조회
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: profiles, count, error } = await query;

    if (error) {
      console.error('Admin getUsers error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 크레딧 정보 별도 조회
    const userIds = (profiles || []).map(p => p.id);
    const { data: creditsData } = await supabase
      .from('credits')
      .select('user_id, current_credits, total_earned, total_used')
      .in('user_id', userIds);

    // 크레딧 맵 생성
    const creditsMap = new Map<string, { current_credits: number; total_earned: number; total_used: number }>();
    (creditsData || []).forEach((c: { user_id: string; current_credits: number; total_earned: number; total_used: number }) => {
      creditsMap.set(c.user_id, c);
    });

    // 유저 데이터 매핑
    const users = (profiles || []).map((profile: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      job_type: string | null;
      industry: string | null;
      tier: string | null;
      role: string | null;
      status: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      job_type: profile.job_type,
      industry: profile.industry,
      tier: profile.tier || null,
      role: profile.role || 'user',
      status: profile.status || 'active',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      credits: creditsMap.get(profile.id) || null,
    }));

    return NextResponse.json({
      data: users,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
