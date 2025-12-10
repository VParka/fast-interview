// ============================================
// Admin System Types
// ============================================

import { Json } from "./database";

/**
 * Admin 권한을 가진 유저 타입
 */
export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
  // 추가 필드
  job_type: string | null;
  industry: string | null;
  tier: string | null;
  credits?: {
    current_credits: number;
    total_earned: number;
    total_used: number;
  };
  status: "active" | "blocked";
}

/**
 * 시스템 로그 타입
 */
export interface SystemLog {
  id: string;
  type: "error" | "api" | "session" | "auth" | "credit";
  level: "info" | "warning" | "error";
  message: string;
  user_id: string | null;
  user_email: string | null;
  metadata: Json;
  created_at: string;
}

/**
 * 면접 세션 로그 타입
 */
export interface SessionLog {
  id: string;
  user_id: string;
  user_email: string;
  job_type: string;
  industry: string | null;
  difficulty: string;
  status: string;
  turn_count: number;
  created_at: string;
  completed_at: string | null;
}

/**
 * 대시보드 통계
 */
export interface AdminStats {
  totalUsers: number;
  newUsersLast7Days: number;
  totalSessions: number;
  todaySessions: number;
  totalCreditsUsed: number;
  totalCreditsRemaining: number;
}

/**
 * 앱 설정 구조
 */
export interface AppConfig {
  // 크레딧 설정
  defaultCredits: number;
  dailyLoginReward: number;
  referralReward: number;
  
  // 플랜별 제한
  freePlan: {
    dailyInterviews: number;
    questionsPerSession: number;
    creditsPerInterview: number;
  };
  paidPlan: {
    dailyInterviews: number;
    questionsPerSession: number;
    creditsPerInterview: number;
  };
  
  // 테마 설정
  theme: {
    primaryColor: string;
    darkMode: boolean;
  };
  
  // 알림 설정
  notifications: {
    emailEnabled: boolean;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  
  // 기능 토글
  features: {
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    premiumEnabled: boolean;
  };
}

/**
 * 최근 활동 로그
 */
export interface ActivityLog {
  id: string;
  type: "interview_start" | "interview_complete" | "signup" | "upgrade" | "credit_purchase" | "error";
  message: string;
  user_email?: string;
  created_at: string;
  icon: string;
  color: string;
}

/**
 * 페이지네이션
 */
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  filter?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
