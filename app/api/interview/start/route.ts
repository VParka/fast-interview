// ============================================
// Interview Start API
// ============================================
// POST /api/interview/start
// - Creates new interview session
// - Assigns random MBTI and names to each interviewer
// - Returns first interviewer message
// - Includes daily usage limit enforcement

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { generateInterviewerResponse, type UserKeyword, getRandomMBTI } from '@/lib/llm/router';
import { ragService } from '@/lib/rag/service';
import {
  INTERVIEWER_BASE,
  type InterviewerType,
  type MBTIType,
  generateSessionInterviewerNames,
  type SessionInterviewerNames,
} from '@/types/interview';
import {
  checkDailyLimit,
  incrementDailyUsage,
  DAILY_LIMITS,
  sanitizeForLogging,
  isValidUUID,
} from '@/lib/security';

const INTERVIEW_START_CREDIT = Number(process.env.CREDIT_USE_INTERVIEW_START ?? 5);

export async function POST(req: NextRequest) {
  console.log('=== Interview Start API Called ===');

  try {
    const body = await req.json();
    // Sanitize body for logging (mask sensitive fields)
    console.log('Request body:', JSON.stringify(sanitizeForLogging(body), null, 2));

    const {
      job_type,
      industry,
      difficulty = 'medium',
      resume_doc_id,
      portfolio_doc_id,
      timer_config,
    } = body;

    // ============================================
    // Input Validation
    // ============================================
    if (!job_type || typeof job_type !== 'string' || job_type.length > 100) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 직무 유형입니다.' },
        { status: 400 }
      );
    }

    if (industry && (typeof industry !== 'string' || industry.length > 100)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 산업 유형입니다.' },
        { status: 400 }
      );
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 난이도입니다.' },
        { status: 400 }
      );
    }

    // Validate UUIDs if provided
    if (resume_doc_id && !isValidUUID(resume_doc_id)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 이력서 문서 ID입니다.' },
        { status: 400 }
      );
    }

    if (portfolio_doc_id && !isValidUUID(portfolio_doc_id)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 포트폴리오 문서 ID입니다.' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, error: 'Supabase 환경 변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OpenAI API key');
      return NextResponse.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

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
              // Server Component context
            }
          },
        },
      }
    );

    // Get authenticated user
    console.log('Checking user authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { success: false, error: `인증 오류: ${authError.message}` },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('No user found - not logged in');
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다. 먼저 로그인해주세요.' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id, user.email);
    const userId = user.id;

    // ============================================
    // Credit charge for starting interview
    // ============================================
    if (INTERVIEW_START_CREDIT > 0) {
      const { data: chargeResult, error: chargeError } = await supabase.rpc('use_credit', {
        p_user_id: userId,
        p_amount: INTERVIEW_START_CREDIT,
        p_reason: 'INTERVIEW_START',
      });

      if (chargeError) {
        console.error('Credit charge error:', chargeError);
        return NextResponse.json(
          { success: false, error: `크레딧 차감 실패: ${chargeError.message}` },
          { status: 400 }
        );
      }

      if (!chargeResult?.success) {
        const status = chargeResult?.error === 'insufficient_funds' ? 402 : 409;
        return NextResponse.json(
          {
            success: false,
            error: chargeResult?.error || '크레딧 차감 실패',
            balance: chargeResult?.balance,
          },
          { status }
        );
      }
    }

    // ============================================
    // Daily Limit Check
    // ============================================
    // Get user tier from profile (default to free)
    let userTier: 'free' | 'pro' | 'unlimited' = 'free';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();

      if (profile?.tier && ['free', 'pro', 'unlimited'].includes(profile.tier)) {
        userTier = profile.tier as 'free' | 'pro' | 'unlimited';
      }
    } catch {
      // Profile might not have tier field, use default
    }

    const dailyLimit = DAILY_LIMITS.interviews[userTier];
    const dailyLimitResult = await checkDailyLimit(userId, {
      maxPerDay: dailyLimit,
      resource: 'interviews',
    });

    if (!dailyLimitResult.success) {
      console.log(`Daily limit reached for user ${userId}: ${dailyLimitResult.used}/${dailyLimitResult.limit}`);
      return NextResponse.json(
        {
          success: false,
          error: `일일 면접 한도에 도달했습니다. (${dailyLimitResult.limit}회/일)`,
          dailyLimit: {
            limit: dailyLimitResult.limit,
            used: dailyLimitResult.used,
            remaining: dailyLimitResult.remaining,
            resetsAt: dailyLimitResult.resetsAt,
          },
        },
        {
          status: 429,
          headers: {
            'X-DailyLimit-Limit': dailyLimitResult.limit.toString(),
            'X-DailyLimit-Remaining': dailyLimitResult.remaining.toString(),
            'X-DailyLimit-Reset': dailyLimitResult.resetsAt,
          },
        }
      );
    }

    console.log(`Daily limit check passed: ${dailyLimitResult.used}/${dailyLimitResult.limit}`);

    // Assign random MBTI to each interviewer for this session
    const interviewerMbti: Record<InterviewerType, MBTIType> = {
      hiring_manager: getRandomMBTI(),
      hr_manager: getRandomMBTI(),
      senior_peer: getRandomMBTI(),
    };
    console.log('Assigned interviewer MBTI:', interviewerMbti);

    // Assign random names to each interviewer for this session
    // Try to get from DB first, fallback to local names
    let interviewerNames: SessionInterviewerNames;
    try {
      const { data: dbNames } = await supabase.rpc('get_random_interviewer_names');
      if (dbNames && dbNames.length > 0) {
        interviewerNames = {
          hiring_manager: dbNames[0].hiring_manager_name,
          hr_manager: dbNames[0].hr_manager_name,
          senior_peer: dbNames[0].senior_peer_name,
        };
        console.log('Got interviewer names from DB:', interviewerNames);
      } else {
        interviewerNames = generateSessionInterviewerNames();
        console.log('Using fallback interviewer names:', interviewerNames);
      }
    } catch (e) {
      console.warn('Failed to get names from DB, using fallback:', e);
      interviewerNames = generateSessionInterviewerNames();
    }

    // Create interview session with MBTI and name assignments
    const sessionTimerConfig = {
      ...(timer_config || {
        default_time_limit: 120,
        warning_threshold: 30,
        auto_submit_on_timeout: true,
      }),
      interviewer_mbti: interviewerMbti, // Store MBTI assignments
      interviewer_names: interviewerNames, // Store name assignments
    };

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        user_id: userId,
        job_type,
        industry,
        difficulty,
        resume_doc_id,
        portfolio_doc_id,
        status: 'active',
        turn_count: 0,
        max_turns: 10,
        timer_config: sessionTimerConfig,
        current_interviewer_id: 'hiring_manager',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      console.error('Session error details:', JSON.stringify(sessionError, null, 2));
      return NextResponse.json(
        { success: false, error: `세션 생성 실패: ${sessionError.message || sessionError.code}` },
        { status: 500 }
      );
    }

    console.log('Session created:', session.id);

    // ============================================
    // Increment Daily Usage (after successful session creation)
    // ============================================
    await incrementDailyUsage(userId, 'interviews');
    console.log('Daily usage incremented');

    // Get resume and portfolio context if available
    let resumeContext = '';
    let portfolioContext = '';

    if (resume_doc_id) {
      try {
        console.log('Getting resume context for doc:', resume_doc_id);
        resumeContext = await ragService.getContextForInterview(
          userId,
          '자기소개와 경력 요약',
          resume_doc_id
        );
      } catch (e) {
        console.warn('Failed to get resume context:', e);
      }
    }

    if (portfolio_doc_id) {
      try {
        console.log('Getting portfolio context for doc:', portfolio_doc_id);
        portfolioContext = await ragService.getContextForInterview(
          userId,
          '프로젝트 경험과 기술 스택',
          portfolio_doc_id
        );
      } catch (e) {
        console.warn('Failed to get portfolio context:', e);
      }
    }

    // Get user's previous interview keywords for continuity
    let userKeywords: UserKeyword[] = [];
    try {
      const { data: keywordsData } = await supabase
        .from('user_keywords')
        .select('keyword, category, context, mentioned_count')
        .eq('user_id', userId)
        .order('mentioned_count', { ascending: false })
        .limit(20); // Top 20 most mentioned keywords

      if (keywordsData && keywordsData.length > 0) {
        userKeywords = keywordsData.map(kw => ({
          keyword: kw.keyword,
          category: kw.category as UserKeyword['category'],
          context: kw.context || undefined,
          mentioned_count: kw.mentioned_count,
        }));
        console.log('Loaded user keywords:', userKeywords.length);
      }
    } catch (e) {
      console.warn('Failed to load user keywords:', e);
    }

    // Generate first message from hiring manager with assigned MBTI
    const firstInterviewer: InterviewerType = 'hiring_manager';
    const interviewerBase = INTERVIEWER_BASE[firstInterviewer];
    const firstInterviewerMbti = interviewerMbti[firstInterviewer];

    console.log('Generating first interviewer message via OpenAI...');
    console.log('First interviewer MBTI:', firstInterviewerMbti);

    // Build context from uploaded documents
    const documentContext = [];
    if (resumeContext) {
      documentContext.push(`[이력서/자소서]\n${resumeContext}`);
    }
    if (portfolioContext) {
      documentContext.push(`[포트폴리오]\n${portfolioContext}`);
    }

    let response;
    try {
      response = await generateInterviewerResponse(
        [{ role: 'user', content: '[면접 시작] 지원자가 입장했습니다.' }],
        firstInterviewer,
        job_type,
        false,
        documentContext.length > 0 ? documentContext.join('\n\n') : undefined,
        {
          userKeywords: userKeywords.length > 0 ? userKeywords : undefined,
          industry: industry || 'IT/테크',
          difficulty,
          turnCount: 1,
          interviewerMbti: firstInterviewerMbti,
        }
      );
      console.log('LLM response received, latency:', response.latencyMs, 'ms');
    } catch (llmError) {
      console.error('LLM call failed:', llmError);
      return NextResponse.json(
        { success: false, error: `AI 응답 생성 실패: ${llmError instanceof Error ? llmError.message : 'Unknown LLM error'}` },
        { status: 500 }
      );
    }

    // Save first message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        session_id: session.id,
        role: 'interviewer',
        interviewer_id: firstInterviewer,
        content: response.content,
        latency_ms: response.latencyMs,
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message save error:', messageError);
    }

    // Calculate remaining daily limit
    const newDailyUsed = dailyLimitResult.used + 1;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        user_id: session.user_id,
        job_type: session.job_type,
        industry: session.industry,
        difficulty: session.difficulty,
        status: session.status,
        turn_count: session.turn_count,
        max_turns: session.max_turns,
        timer_config: session.timer_config,
        current_interviewer_id: firstInterviewer,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      first_message: {
        id: message?.id || 'welcome',
        session_id: session.id,
        role: 'interviewer',
        interviewer_id: firstInterviewer,
        content: response.content,
        timestamp: new Date().toISOString(),
        latency_ms: response.latencyMs,
      },
      interviewer: {
        id: firstInterviewer,
        name: interviewerNames[firstInterviewer], // Use randomly assigned name
        role: interviewerBase.role,
        emoji: interviewerBase.emoji,
        personality: firstInterviewerMbti,
      },
      // All interviewer names for client display
      interviewer_names: interviewerNames,
      // Daily usage info for client
      dailyUsage: {
        limit: dailyLimitResult.limit,
        used: newDailyUsed,
        remaining: Math.max(0, dailyLimitResult.limit - newDailyUsed),
        resetsAt: dailyLimitResult.resetsAt,
      },
    }, {
      headers: {
        'X-DailyLimit-Limit': dailyLimitResult.limit.toString(),
        'X-DailyLimit-Remaining': Math.max(0, dailyLimitResult.limit - newDailyUsed).toString(),
        'X-DailyLimit-Reset': dailyLimitResult.resetsAt,
      },
    });
  } catch (error) {
    console.error('=== Interview Start Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json(
      {
        success: false,
        error: '면접 시작 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined,
      },
      { status: 500 }
    );
  }
}
