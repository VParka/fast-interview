"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageCircle,
  RotateCcw,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Unlock,
  FileText,
  BarChart3,
  Users,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";
import { INTERVIEWERS, type InterviewerType } from "@/types/interview";

// 5축 핵심 역량 라벨
const CATEGORY_LABELS: Record<string, string> = {
  logical_structure: "논리적 구조",
  job_expertise: "직무 전문성",
  attitude_communication: "태도/커뮤니케이션",
  company_fit: "회사 적합도",
  growth_potential: "성장 가능성",
};

// Bell Curve (Normal Distribution) Component
interface BellCurveProps {
  percentile: number; // User's percentile (0-100, where 0 is best)
  score: number;
}

function BellCurve({ percentile, score }: BellCurveProps) {
  // Generate normal distribution data points
  const bellCurveData = useMemo(() => {
    const data = [];
    const mean = 50;
    const stdDev = 15;

    for (let x = 0; x <= 100; x += 2) {
      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
      const y = Math.exp(exponent) / (stdDev * Math.sqrt(2 * Math.PI));
      data.push({ x, y: y * 100 }); // Scale for visibility
    }
    return data;
  }, []);

  // Calculate user's position on the curve (100 - percentile because lower percentile = higher rank)
  const userPosition = 100 - percentile;
  const userY = useMemo(() => {
    const mean = 50;
    const stdDev = 15;
    const exponent = -Math.pow(userPosition - mean, 2) / (2 * Math.pow(stdDev, 2));
    return (Math.exp(exponent) / (stdDev * Math.sqrt(2 * Math.PI))) * 100;
  }, [userPosition]);

  return (
    <div className="h-[200px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={bellCurveData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <defs>
            <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--soft-blue))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--soft-blue))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--mint))" stopOpacity={0.6} />
              <stop offset="95%" stopColor="hsl(var(--mint))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
            tickFormatter={(value) => {
              if (value === 0) return "하위";
              if (value === 50) return "평균";
              if (value === 100) return "상위";
              return "";
            }}
          />
          <YAxis hide />
          <Area
            type="monotone"
            dataKey="y"
            stroke="hsl(var(--soft-blue))"
            fill="url(#bellGradient)"
            strokeWidth={2}
          />
          {/* User position reference line */}
          <ReferenceLine
            x={userPosition}
            stroke="hsl(var(--mint))"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <ReferenceDot
            x={userPosition}
            y={userY}
            r={8}
            fill="hsl(var(--mint))"
            stroke="hsl(var(--background))"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* User position label */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint/20 border border-mint/30"
        style={{ left: `${userPosition}%` }}
      >
        <Crown className="w-4 h-4 text-mint" />
        <span className="text-sm font-semibold text-mint">
          상위 {100 - percentile}%
        </span>
      </motion.div>
    </div>
  );
}

// Locked Report Section Component
interface LockedSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onUnlock: () => void;
}

function LockedSection({ title, description, icon, onUnlock }: LockedSectionProps) {
  return (
    <div className="relative glass-card rounded-3xl p-8 overflow-hidden">
      {/* Blurred placeholder content */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background/80 backdrop-blur-sm z-10" />

      {/* Placeholder bars */}
      <div className="space-y-4 opacity-30">
        <div className="h-4 bg-secondary rounded-full w-3/4" />
        <div className="h-4 bg-secondary rounded-full w-1/2" />
        <div className="h-4 bg-secondary rounded-full w-2/3" />
        <div className="h-20 bg-secondary rounded-xl" />
        <div className="h-4 bg-secondary rounded-full w-1/2" />
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-full bg-secondary/80 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {description}
        </p>
        <Button variant="mint" onClick={onUnlock} className="gap-2">
          <Unlock className="w-4 h-4" />
          프리미엄으로 잠금 해제
        </Button>
      </div>
    </div>
  );
}

// Blur Reveal Component - Click to reveal scores
interface BlurRevealProps {
  children: React.ReactNode;
  isRevealed: boolean;
  onReveal: () => void;
  revealText?: string;
}

function BlurReveal({ children, isRevealed, onReveal, revealText = "클릭하여 결과 확인" }: BlurRevealProps) {
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isRevealed ? (
          <motion.div
            key="blurred"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative cursor-pointer group"
            onClick={onReveal}
          >
            {/* Blurred content */}
            <div className="filter blur-lg select-none pointer-events-none">
              {children}
            </div>

            {/* Overlay with reveal prompt */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-3xl"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-mint/20 flex items-center justify-center border-2 border-mint/30 group-hover:border-mint group-hover:bg-mint/30 transition-all">
                  <Eye className="w-10 h-10 text-mint" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground mb-1">{revealText}</p>
                  <p className="text-sm text-muted-foreground">터치하여 면접 결과를 확인하세요</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Category score with reasoning
interface CategoryScore {
  score: number;
  reasoning: string;
}

interface InterviewResult {
  id: string;
  session_id: string;
  overall_score: number;
  pass_status: "pass" | "borderline" | "fail";
  interviewer_scores: Record<string, number>;
  interviewer_comments?: Record<string, string>;
  category_scores?: {
    logical_structure: CategoryScore;
    job_expertise: CategoryScore;
    attitude_communication: CategoryScore;
    company_fit: CategoryScore;
    growth_potential: CategoryScore;
  };
  rank_percentile?: number;
  growth_index?: number;
  feedback_summary: string;
  strengths: string[];
  improvements: string[];
  turn_count?: number;
  duration_minutes?: number;
  created_at: string;
}

// No mock data - use actual DB scores only
const createEmptyResult = (sessionId: string): InterviewResult => ({
  id: sessionId,
  session_id: sessionId,
  overall_score: 0,
  pass_status: "borderline",
  interviewer_scores: {
    hiring_manager: 0,
    hr_manager: 0,
    senior_peer: 0,
  },
  category_scores: {
    logical_structure: { score: 0, reasoning: "" },
    job_expertise: { score: 0, reasoning: "" },
    attitude_communication: { score: 0, reasoning: "" },
    company_fit: { score: 0, reasoning: "" },
    growth_potential: { score: 0, reasoning: "" },
  },
  feedback_summary: "결과를 불러오는 중...",
  strengths: [],
  improvements: [],
  created_at: new Date().toISOString(),
});

export default function InterviewResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    competency: true,
    interviewers: true,
    feedback: true,
  });

  // Handle unlock button click
  const handleUnlock = () => {
    // In production, this would redirect to payment/upgrade page
    router.push("/pricing");
  };

  // Handle reveal click
  const handleReveal = () => {
    setIsRevealed(true);
  };

  useEffect(() => {
    const fetchResult = async () => {
      // Try to get result from sessionStorage first (from interview end)
      const storedResult = sessionStorage.getItem("interviewResult");
      if (storedResult) {
        const parsed = JSON.parse(storedResult);
        setResult(parsed);
        sessionStorage.removeItem("interviewResult");
        setLoading(false);
        return;
      }

      // Fetch from database
      try {
        const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = createBrowserSupabaseClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setResult(createEmptyResult(resultId));
          setLoading(false);
          return;
        }

        // Fetch result by session_id
        const { data: resultData, error } = await supabase
          .from("interview_results")
          .select(`
            *,
            interview_sessions (
              id,
              job_type,
              difficulty,
              turn_count,
              created_at
            )
          `)
          .eq("session_id", resultId)
          .eq("user_id", user.id)
          .single();

        if (error || !resultData) {
          console.error("Error fetching result:", error);
          setResult(createEmptyResult(resultId));
          setLoading(false);
          return;
        }

        // Type assertion for resultData
        const data = resultData as {
          id: string;
          session_id: string;
          overall_score: number;
          pass_status: "pass" | "borderline" | "fail";
          interviewer_scores?: Record<string, number>;
          interviewer_comments?: Record<string, string>;
          category_scores?: {
            logical_structure: CategoryScore;
            job_expertise: CategoryScore;
            attitude_communication: CategoryScore;
            company_fit: CategoryScore;
            growth_potential: CategoryScore;
          };
          rank_percentile?: number;
          growth_index?: number;
          feedback_summary?: string;
          feedback?: string;
          strengths?: string[];
          improvements?: string[];
          created_at: string;
          interview_sessions?: {
            id: string;
            job_type: string;
            difficulty: string;
            turn_count: number;
            created_at: string;
          };
        };

        // Transform to InterviewResult format - use ACTUAL DB scores only
        const transformedResult: InterviewResult = {
          id: data.id,
          session_id: data.session_id,
          overall_score: data.overall_score,
          pass_status: data.pass_status,
          interviewer_scores: data.interviewer_scores || {
            hiring_manager: 0,
            hr_manager: 0,
            senior_peer: 0,
          },
          interviewer_comments: data.interviewer_comments,
          category_scores: data.category_scores || {
            logical_structure: { score: 0, reasoning: "" },
            job_expertise: { score: 0, reasoning: "" },
            attitude_communication: { score: 0, reasoning: "" },
            company_fit: { score: 0, reasoning: "" },
            growth_potential: { score: 0, reasoning: "" },
          },
          rank_percentile: data.rank_percentile,
          growth_index: data.growth_index,
          feedback_summary: data.feedback_summary || data.feedback || "평가 결과가 없습니다.",
          strengths: data.strengths || [],
          improvements: data.improvements || [],
          turn_count: data.interview_sessions?.turn_count,
          duration_minutes: data.interview_sessions?.turn_count
            ? Math.round(data.interview_sessions.turn_count * 2.5)
            : undefined,
          created_at: data.created_at,
        };

        setResult(transformedResult);
      } catch (error) {
        console.error("Error fetching result:", error);
        setResult(createEmptyResult(resultId));
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-mint border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">결과를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">면접 결과가 존재하지 않거나 삭제되었습니다.</p>
          <Button variant="mint" onClick={() => router.push("/dashboard")}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // Prepare radar chart data - Convert 5-axis category scores (1-5 scale) to percentage
  const radarData = result.category_scores
    ? Object.entries(result.category_scores).map(([key, value]) => ({
        skill: CATEGORY_LABELS[key] || key,
        value: Math.round(((value.score - 1) / 4) * 100), // Convert 1-5 to 0-100
        fullMark: 100,
      }))
    : [];

  // Status colors and icons
  const statusConfig = {
    pass: { color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2, label: "합격" },
    borderline: { color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertCircle, label: "보류" },
    fail: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "불합격" },
  };

  const status = statusConfig[result.pass_status];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl font-bold text-foreground">
                면접 결과 분석
              </h1>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${status.bg} ${status.color} text-sm font-medium`}>
                <status.icon className="w-4 h-4" />
                {status.label}
              </div>
            </div>
            <p className="text-muted-foreground">
              {new Date(result.created_at).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })} · {result.duration_minutes || 0}분 · {result.turn_count || 0}턴
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            공유
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            PDF 다운로드
          </Button>
        </div>
      </div>

      {/* Score Overview - Wrapped in BlurReveal */}
      <BlurReveal isRevealed={isRevealed} onReveal={handleReveal} revealText="면접 결과 확인하기">
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-1"
          >
            <div className="glass-card rounded-3xl p-8 text-center">
              {/* Score Circle */}
              <div className="relative inline-block mb-6">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="hsl(var(--mint))"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.overall_score / 100) * 440} 440`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-bold text-foreground">
                    {result.overall_score}
                  </span>
                  <span className="text-sm text-muted-foreground">종합 점수</span>
                </div>
              </div>

              {/* Rank */}
              {result.rank_percentile !== undefined && (
                <div className="flex items-center justify-center gap-2 text-mint mb-4">
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">상위 {100 - result.rank_percentile}%</span>
                </div>
              )}

              {/* Growth Index */}
              {result.growth_index !== undefined && (
                <div className={`flex items-center justify-center gap-2 ${result.growth_index >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {result.growth_index >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    이전 대비 {result.growth_index >= 0 ? "+" : ""}{result.growth_index}%
                  </span>
                </div>
              )}
            </div>
          </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="glass-card rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-mint" />
              <h2 className="font-display text-xl font-bold text-foreground">
                5축 핵심 역량 분석
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Radar
                      name="역량"
                      dataKey="value"
                      stroke="hsl(var(--mint))"
                      fill="hsl(var(--mint))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* 5-Axis Category List */}
              <div className="space-y-3">
                {result.category_scores && Object.entries(result.category_scores)
                  .sort(([, a], [, b]) => b.score - a.score)
                  .map(([key, categoryScore]) => {
                    const percentValue = Math.round(((categoryScore.score - 1) / 4) * 100);
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-28 truncate">
                          {CATEGORY_LABELS[key] || key}
                        </span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentValue}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className={`h-full ${percentValue >= 70 ? "bg-mint" : percentValue >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground w-12 text-right">
                          {categoryScore.score}/5
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </BlurReveal>

      {/* Interviewer Feedback with Progress Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-8"
      >
        <div className="glass-card rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-5 h-5 text-soft-blue" />
            <h2 className="font-display text-xl font-bold text-foreground">
              면접관별 호감도
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(result.interviewer_scores).map(([id, score]) => {
              const interviewer = INTERVIEWERS[id as InterviewerType];
              if (!interviewer) return null;

              // Determine favorability color based on score
              const getFavorabilityColor = (s: number) => {
                if (s >= 85) return "bg-mint";
                if (s >= 70) return "bg-soft-blue";
                if (s >= 50) return "bg-amber-500";
                return "bg-destructive";
              };

              const getFavorabilityLabel = (s: number) => {
                if (s >= 85) return "매우 긍정적";
                if (s >= 70) return "긍정적";
                if (s >= 50) return "보통";
                return "부정적";
              };

              return (
                <div
                  key={id}
                  className="p-6 rounded-2xl bg-secondary/30 border border-border/50 hover:border-mint/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{interviewer.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{interviewer.name}</p>
                      <p className="text-xs text-muted-foreground">{interviewer.role}</p>
                    </div>
                    <span className="text-lg font-bold text-mint">{score}점</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full ${getFavorabilityColor(score)} rounded-full`}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">호감도</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      score >= 85 ? "bg-mint/10 text-mint" :
                      score >= 70 ? "bg-soft-blue/10 text-soft-blue" :
                      score >= 50 ? "bg-amber-500/10 text-amber-500" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {getFavorabilityLabel(score)}
                    </span>
                  </div>
                  {/* Interviewer Comment */}
                  {result.interviewer_comments?.[id] && (
                    <p className="text-xs text-muted-foreground mt-3 italic border-t border-border/50 pt-3">
                      &ldquo;{result.interviewer_comments[id]}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Bell Curve - Rank Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mb-8"
      >
        <div className="glass-card rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-soft-blue" />
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  정규분포 순위
                </h2>
                <p className="text-sm text-muted-foreground">
                  전체 응시자 대비 당신의 위치
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-mint/10 border border-mint/20">
              <Trophy className="w-4 h-4 text-mint" />
              <span className="font-semibold text-mint">
                상위 {100 - (result.rank_percentile || 15)}%
              </span>
            </div>
          </div>
          <BellCurve
            percentile={result.rank_percentile || 15}
            score={result.overall_score}
          />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">하위 25%</p>
              <p className="font-semibold text-foreground">60점 이하</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">평균</p>
              <p className="font-semibold text-foreground">75점</p>
            </div>
            <div className="p-3 rounded-xl bg-mint/10 border border-mint/20">
              <p className="text-xs text-mint mb-1">당신의 점수</p>
              <p className="font-semibold text-mint">{result.overall_score}점</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feedback Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-8"
      >
        <div className="glass-card rounded-3xl p-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            종합 피드백
          </h2>
          <p className="text-foreground leading-relaxed mb-6">
            {result.feedback_summary}
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-green-500 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                강점
              </h3>
              <ul className="space-y-2">
                {result.strengths.map((strength, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-foreground p-3 rounded-lg bg-green-500/5"
                  >
                    <span className="text-green-500 mt-0.5">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-500 mb-3">
                <TrendingUp className="w-4 h-4" />
                개선점
              </h3>
              <ul className="space-y-2">
                {result.improvements.map((improvement, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-foreground p-3 rounded-lg bg-amber-500/5"
                  >
                    <span className="text-amber-500 mt-0.5">{index + 1}.</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Premium Locked Sections */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="grid md:grid-cols-2 gap-8 mb-8"
        >
          <LockedSection
            title="상세 스피치 분석"
            description="발화 속도, 필러워드 사용 빈도, 침묵 패턴 등 상세한 스피치 분석 리포트를 확인하세요."
            icon={<BarChart3 className="w-5 h-5 text-soft-blue" />}
            onUnlock={handleUnlock}
          />
          <LockedSection
            title="AI 맞춤 코칭 리포트"
            description="AI가 분석한 당신만의 맞춤 개선 전략과 면접 답변 예시를 받아보세요."
            icon={<FileText className="w-5 h-5 text-mint" />}
            onUnlock={handleUnlock}
          />
        </motion.div>
      )}

      {/* Premium Unlocked Sections (shown when premium) */}
      {isPremium && (
        <>
          {/* Detailed Speech Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mb-8"
          >
            <div className="glass-card rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-5 h-5 text-soft-blue" />
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    상세 스피치 분석
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-mint/10 text-mint text-xs font-medium">
                    Premium
                  </span>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { label: "분당 단어 수 (WPM)", value: "142", status: "적정 속도", color: "mint" },
                  { label: "필러워드 비율", value: "3.2%", status: "양호", color: "mint" },
                  { label: "평균 응답 시간", value: "2.1초", status: "빠른 편", color: "soft-blue" },
                  { label: "문장 완결률", value: "94%", status: "우수", color: "mint" },
                ].map((metric) => (
                  <div key={metric.label} className="p-4 rounded-xl bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                    <p className={`font-display text-2xl font-bold text-${metric.color}`}>
                      {metric.value}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${metric.color}/10 text-${metric.color}`}>
                      {metric.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* AI Coaching Report */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-8"
          >
            <div className="glass-card rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-mint" />
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    AI 맞춤 코칭 리포트
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-mint/10 text-mint text-xs font-medium">
                    Premium
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-mint/5 border border-mint/20">
                  <h3 className="font-semibold text-foreground mb-2">추천 개선 전략</h3>
                  <p className="text-sm text-muted-foreground">
                    STAR 기법을 활용하여 답변을 구조화하는 연습을 권장합니다. 특히 문제 해결 관련 질문에서
                    구체적인 수치와 결과를 포함하면 더 설득력 있는 답변이 될 것입니다.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-soft-blue/5 border border-soft-blue/20">
                  <h3 className="font-semibold text-foreground mb-2">예시 답변 템플릿</h3>
                  <p className="text-sm text-muted-foreground">
                    &quot;해당 프로젝트에서 [상황 설명]의 문제가 있었습니다. 저는 [행동/접근 방법]을 통해
                    [구체적 결과/수치]를 달성했습니다.&quot;
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          대시보드로 돌아가기
        </Button>
        <Button
          variant="mint"
          onClick={() => router.push("/interview/setup")}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          다시 면접 보기
        </Button>
      </motion.div>
    </div>
  );
}
