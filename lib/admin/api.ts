// ============================================
// Admin API Wrapper Functions
// ============================================

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { 
  AdminUser, 
  AdminStats, 
  SessionLog, 
  AppConfig, 
  ActivityLog,
  PaginationParams,
  PaginatedResponse 
} from "@/types/admin";

/**
 * Admin 권한 확인
 */
export async function checkAdminAccess(): Promise<{
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: AdminUser | null;
}> {
  const supabase = createBrowserSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { isAuthenticated: false, isAdmin: false, user: null };
  }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  
  if (!profile) {
    return { isAuthenticated: true, isAdmin: false, user: null };
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData = profile as any;
  const role = profileData.role || "user";
  const isAdmin = role === "admin";
  
  const adminUser: AdminUser = {
    id: profileData.id,
    email: profileData.email,
    full_name: profileData.full_name,
    avatar_url: profileData.avatar_url,
    job_type: profileData.job_type,
    industry: profileData.industry,
    tier: profileData.tier || null,
    role: role as "user" | "admin",
    status: "active",
    created_at: profileData.created_at,
    updated_at: profileData.updated_at,
  };
  
  return {
    isAuthenticated: true,
    isAdmin,
    user: adminUser,
  };
}

/**
 * 대시보드 통계 조회
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createBrowserSupabaseClient();
  
  // 전체 유저 수
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  
  // 최근 7일 신규 가입
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { count: newUsersLast7Days } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString());
  
  // 전체 면접 세션 수
  const { count: totalSessions } = await supabase
    .from("interview_sessions")
    .select("*", { count: "exact", head: true });
  
  // 오늘 생성된 면접 수
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: todaySessions } = await supabase
    .from("interview_sessions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());
  
  // 크레딧 통계
  const { data: creditData } = await supabase
    .from("credits")
    .select("current_credits, total_used");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credits = (creditData || []) as any[];
  const totalCreditsRemaining = credits.reduce((acc, c) => acc + (c.current_credits || 0), 0);
  const totalCreditsUsed = credits.reduce((acc, c) => acc + (c.total_used || 0), 0);
  
  return {
    totalUsers: totalUsers || 0,
    newUsersLast7Days: newUsersLast7Days || 0,
    totalSessions: totalSessions || 0,
    todaySessions: todaySessions || 0,
    totalCreditsUsed,
    totalCreditsRemaining,
  };
}

/**
 * 유저 목록 조회 (페이지네이션)
 */
export async function getUsers(params: PaginationParams): Promise<PaginatedResponse<AdminUser>> {
  const supabase = createBrowserSupabaseClient();
  const { page, limit, search, filter } = params;
  const offset = (page - 1) * limit;
  
  // credits 조인을 left join으로 변경 (credits가 없는 유저도 표시)
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });
  
  // 검색
  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  
  // 필터
  if (filter?.role) {
    query = query.eq("role", filter.role);
  }
  
  // 페이지네이션
  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
  
  const { data, count, error } = await query;
  
  if (error) {
    console.error("getUsers error:", error);
    throw error;
  }
  
  // 각 유저의 크레딧 정보 별도 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (data || []) as any[];
  
  // 유저 ID로 크레딧 조회
  const userIds = profiles.map(p => p.id);
  const { data: creditsData } = await supabase
    .from("credits")
    .select("user_id, current_credits, total_earned, total_used")
    .in("user_id", userIds);
  
  // 크레딧 맵 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creditsMap = new Map<string, any>();
  (creditsData || []).forEach((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    creditsMap.set((c as any).user_id, c);
  });
  
  const users: AdminUser[] = profiles.map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    job_type: profile.job_type,
    industry: profile.industry,
    tier: profile.tier || null,
    role: profile.role || "user",
    status: profile.status || "active",
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    credits: creditsMap.get(profile.id) || null,
  }));
  
  return {
    data: users,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * 유저 역할 변경
 */
export async function updateUserRole(userId: string, role: "user" | "admin"): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any)
    .update({ role })
    .eq("id", userId);
  
  if (error) throw error;
}

/**
 * 유저 상태 변경
 */
export async function updateUserStatus(userId: string, status: "active" | "blocked"): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any)
    .update({ status })
    .eq("id", userId);
  
  if (error) throw error;
}

/**
 * 면접 세션 로그 조회
 */
export async function getSessionLogs(params: PaginationParams & {
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<SessionLog>> {
  const supabase = createBrowserSupabaseClient();
  const { page, limit, search, startDate, endDate } = params;
  const offset = (page - 1) * limit;
  
  // profiles 조인 제거하고 별도 조회
  let query = supabase
    .from("interview_sessions")
    .select(`
      id,
      user_id,
      job_type,
      industry,
      difficulty,
      status,
      turn_count,
      created_at,
      updated_at
    `, { count: "exact" });
  
  // 날짜 필터
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }
  
  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
  
  const { data, count, error } = await query;
  
  if (error) {
    console.error("getSessionLogs error:", error);
    throw error;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = (data || []) as any[];
  
  // 유저 이메일 별도 조회
  const userIds = [...new Set(sessions.map(s => s.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailMap = new Map<string, string>();
  (profilesData || []).forEach((p: any) => {
    emailMap.set(p.id, p.email);
  });
  
  const logs: SessionLog[] = sessions.map((session) => ({
    id: session.id,
    user_id: session.user_id,
    user_email: emailMap.get(session.user_id) || "알 수 없음",
    job_type: session.job_type || "미지정",
    industry: session.industry,
    difficulty: session.difficulty || "medium",
    status: session.status || "waiting",
    turn_count: session.turn_count || 0,
    created_at: session.created_at,
    completed_at: session.status === "completed" ? session.updated_at : null,
  }));
  
  return {
    data: logs,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * 최근 활동 로그 생성 (면접 세션 기반)
 */
export async function getRecentActivity(limitCount: number = 10): Promise<ActivityLog[]> {
  const supabase = createBrowserSupabaseClient();
  
  // 최근 면접 세션
  const { data: sessions } = await supabase
    .from("interview_sessions")
    .select("id, user_id, status, created_at, profiles!inner(email)")
    .order("created_at", { ascending: false })
    .limit(limitCount);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities: ActivityLog[] = ((sessions || []) as any[]).map((session) => {
    const email = session.profiles?.email || "Unknown";
    const isComplete = session.status === "completed";
    
    return {
      id: session.id,
      type: isComplete ? "interview_complete" : "interview_start",
      message: isComplete 
        ? `${email}님이 면접을 완료했습니다.`
        : `${email}님이 면접을 시작했습니다.`,
      user_email: email,
      created_at: session.created_at,
      icon: isComplete ? "CheckCircle" : "Play",
      color: isComplete ? "text-green-500" : "text-mint",
    };
  });
  
  return activities;
}

// ============================================
// AppConfig 관리 (localStorage 기반 임시 구현)
// ============================================

const DEFAULT_CONFIG: AppConfig = {
  defaultCredits: 10,
  dailyLoginReward: 1,
  referralReward: 3,
  freePlan: {
    dailyInterviews: 3,
    questionsPerSession: 10,
    creditsPerInterview: 1,
  },
  paidPlan: {
    dailyInterviews: -1, // unlimited
    questionsPerSession: 30,
    creditsPerInterview: 1,
  },
  theme: {
    primaryColor: "#7FFFD4",
    darkMode: true,
  },
  notifications: {
    emailEnabled: true,
    webhookEnabled: false,
    webhookUrl: "",
  },
  features: {
    maintenanceMode: false,
    registrationEnabled: true,
    premiumEnabled: true,
  },
};

/**
 * 앱 설정 조회
 */
export function getAppConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  
  const stored = localStorage.getItem("admin_app_config");
  if (!stored) return DEFAULT_CONFIG;
  
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 앱 설정 저장
 */
export function saveAppConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("admin_app_config", JSON.stringify(config));
}

// ============================================
// 차트 데이터 (7일간 면접 세션 트렌드)
// ============================================

export interface ChartDataPoint {
  date: string;
  sessions: number;
  users: number;
}

export async function getSessionTrendData(): Promise<ChartDataPoint[]> {
  const supabase = createBrowserSupabaseClient();
  const result: ChartDataPoint[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const startOfDay = new Date(dateStr).toISOString();
    const endOfDay = new Date(date.getTime() + 86400000).toISOString();
    
    const { count: sessions } = await supabase
      .from("interview_sessions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay)
      .lt("created_at", endOfDay);
    
    const { count: users } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay)
      .lt("created_at", endOfDay);
    
    result.push({
      date: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      sessions: sessions || 0,
      users: users || 0,
    });
  }
  
  return result;
}

// ============================================
// 크레딧 수동 지급
// ============================================

export async function grantCredits(
  userId: string, 
  amount: number, 
  reason: string = "관리자 지급"
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const supabase = createBrowserSupabaseClient();
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("add_credit", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    });
    
    if (error) throw error;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data as any;
    return { 
      success: true, 
      newBalance: result?.new_balance || result?.balance 
    };
  } catch (error) {
    console.error("Grant credits failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "크레딧 지급 실패" 
    };
  }
}

// ============================================
// 결제 (크레딧 트랜잭션) 내역
// ============================================

export interface CreditTransaction {
  id: string;
  user_id: string;
  user_email?: string;
  amount: number;
  reason: string;
  balance_after: number | null;
  created_at: string;
}

export async function getCreditTransactions(params: PaginationParams): Promise<PaginatedResponse<CreditTransaction>> {
  const supabase = createBrowserSupabaseClient();
  const { page, limit } = params;
  const offset = (page - 1) * limit;
  
  try {
    // credit_transactions 테이블 조회 (테이블이 없을 수 있음)
    let query = supabase
      .from("credit_transactions")
      .select("*", { count: "exact" });
    
    query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error("getCreditTransactions error:", error);
      // 테이블이 없으면 빈 결과 반환
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txs = (data || []) as any[];
    
    // 유저 이메일 별도 조회
    const userIds = [...new Set(txs.map(t => t.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailMap = new Map<string, string>();
    (profilesData || []).forEach((p: any) => {
      emailMap.set(p.id, p.email);
    });
    
    const transactions: CreditTransaction[] = txs.map((tx) => ({
      id: tx.id,
      user_id: tx.user_id,
      user_email: emailMap.get(tx.user_id) || "알 수 없음",
      amount: tx.amount,
      reason: tx.reason || "내역 없음",
      balance_after: tx.balance_after,
      created_at: tx.created_at,
    }));
    
    return {
      data: transactions,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err) {
    console.error("getCreditTransactions failed:", err);
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
}

// ============================================
// 질문 관리
// ============================================

export interface InterviewQuestion {
  id: string;
  category: string;
  job_type: string | null;
  difficulty: string;
  question_text: string;
  evaluation_points: string[];
  sample_answer: string | null;
  created_at: string;
}

export async function getQuestions(params: PaginationParams & {
  category?: string;
  difficulty?: string;
}): Promise<PaginatedResponse<InterviewQuestion>> {
  const supabase = createBrowserSupabaseClient();
  const { page, limit, search, category, difficulty } = params;
  const offset = (page - 1) * limit;
  
  let query = supabase
    .from("questions")
    .select("*", { count: "exact" });
  
  if (search) {
    query = query.ilike("question_text", `%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }
  
  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
  
  const { data, count, error } = await query;
  
  if (error) throw error;
  
  return {
    data: (data || []) as InterviewQuestion[],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function createQuestion(question: Omit<InterviewQuestion, "id" | "created_at">): Promise<InterviewQuestion> {
  const supabase = createBrowserSupabaseClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("questions") as any)
    .insert(question)
    .select()
    .single();
  
  if (error) throw error;
  return data as InterviewQuestion;
}

export async function updateQuestion(id: string, updates: Partial<InterviewQuestion>): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("questions") as any)
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
}

export async function deleteQuestion(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
}

// ============================================
// 이메일 발송 (Mock - 실제 구현 시 API 연동 필요)
// ============================================

export interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  content: string;
  sent_at: string;
}

// 이메일 발송 기록 (localStorage 기반 mock)
export function getEmailHistory(): EmailRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("admin_email_history");
  return stored ? JSON.parse(stored) : [];
}

export function sendEmail(to: string, subject: string, content: string): EmailRecord {
  const record: EmailRecord = {
    id: Date.now().toString(),
    to,
    subject,
    content,
    sent_at: new Date().toISOString(),
  };
  
  const history = getEmailHistory();
  history.unshift(record);
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_email_history", JSON.stringify(history.slice(0, 100)));
  }
  
  // 실제 이메일 API 연동 위치
  console.log("Email sent (mock):", record);
  
  return record;
}
