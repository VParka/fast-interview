"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { INTERVIEWERS, COMPETENCY_LABELS, type CompetencyScores, type InterviewerType } from "@/types/interview";

interface InterviewResult {
  id: string;
  session_id: string;
  overall_score: number;
  pass_status: "pass" | "borderline" | "fail";
  interviewer_scores: Record<string, number>;
  competency_scores: CompetencyScores;
  rank_percentile?: number;
  growth_index?: number;
  feedback_summary: string;
  strengths: string[];
  improvements: string[];
  turn_count?: number;
  duration_minutes?: number;
  created_at: string;
}

// Mock data fallback
const mockResult: InterviewResult = {
  id: "1",
  session_id: "session-1",
  overall_score: 85,
  pass_status: "pass",
  interviewer_scores: {
    hiring_manager: 87,
    hr_manager: 85,
    senior_peer: 83,
  },
  competency_scores: {
    behavioral: 88,
    clarity: 82,
    comprehension: 90,
    communication: 85,
    reasoning: 80,
    problem_solving: 78,
    leadership: 75,
    adaptability: 82,
  },
  rank_percentile: 15,
  growth_index: 8,
  feedback_summary: "전반적으로 우수한 면접 성과를 보여주셨습니다. 특히 기술적 이해도와 커뮤니케이션 능력이 돋보였으며, 문제 해결 접근 방식도 논리적이었습니다.",
  strengths: [
    "기술 스택에 대한 깊은 이해와 실무 경험이 잘 드러남",
    "질문의 의도를 빠르게 파악하고 구조화된 답변 제시",
    "팀워크와 협업에 대한 긍정적인 마인드셋",
  ],
  improvements: [
    "STAR 기법을 활용한 답변 구조화 연습이 필요합니다.",
    "기술 트레이드오프 설명 시 더 구체적인 수치를 활용해보세요.",
    "답변 시간을 조금 더 간결하게 조절하면 좋겠습니다.",
  ],
  turn_count: 10,
  duration_minutes: 25,
  created_at: new Date().toISOString(),
};

export default function InterviewResultPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    competency: true,
    interviewers: true,
    feedback: true,
  });

  useEffect(() => {
    // Try to get result from sessionStorage first
    const storedResult = sessionStorage.getItem("interviewResult");
    if (storedResult) {
      setResult(JSON.parse(storedResult));
      sessionStorage.removeItem("interviewResult");
      setLoading(false);
    } else {
      // Use mock data for demo (in production, fetch from API)
      setResult(mockResult);
      setLoading(false);
    }
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

  // Prepare radar chart data
  const radarData = Object.entries(result.competency_scores).map(([key, value]) => ({
    skill: COMPETENCY_LABELS[key as keyof CompetencyScores],
    value,
    fullMark: 100,
  }));

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

      {/* Score Overview */}
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
                8축 역량 분석
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

              {/* Competency List */}
              <div className="space-y-3">
                {Object.entries(result.competency_scores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-20 truncate">
                        {COMPETENCY_LABELS[key as keyof CompetencyScores]}
                      </span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${value}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className={`h-full ${value >= 70 ? "bg-mint" : value >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-8 text-right">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interviewer Feedback */}
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
              면접관별 평가
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(result.interviewer_scores).map(([id, score]) => {
              const interviewer = INTERVIEWERS[id as InterviewerType];
              if (!interviewer) return null;

              return (
                <div
                  key={id}
                  className="p-6 rounded-2xl bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{interviewer.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{interviewer.name}</p>
                      <p className="text-xs text-muted-foreground">{interviewer.role}</p>
                    </div>
                    <span className="text-lg font-bold text-mint">{score}점</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-mint"
                    />
                  </div>
                </div>
              );
            })}
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

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
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
