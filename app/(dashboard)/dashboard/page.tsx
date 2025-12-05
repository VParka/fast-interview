"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Play,
  Clock,
  TrendingUp,
  Target,
  Calendar,
  ArrowRight,
  Mic,
  FileText,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { JOB_TYPES } from "@/types/interview";
import type { CompetencyScores } from "@/types/interview";

interface InterviewSession {
  id: string;
  job_type: string;
  difficulty: string;
  status: string;
  turn_count: number;
  created_at: string;
}

interface InterviewResult {
  id: string;
  session_id: string;
  overall_score: number;
  pass_status: string;
  competency_scores: CompetencyScores;
  created_at: string;
  interview_sessions?: InterviewSession;
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  totalMinutes: number;
  thisWeekCount: number;
  scoreChange: number;
  interviewChange: number;
}

const COMPETENCY_LABELS: Record<keyof CompetencyScores, string> = {
  behavioral: "행동역량",
  clarity: "명확성",
  comprehension: "이해력",
  communication: "커뮤니케이션",
  reasoning: "논리적사고",
  problem_solving: "문제해결",
  leadership: "리더십",
  adaptability: "적응력",
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageScore: 0,
    totalMinutes: 0,
    thisWeekCount: 0,
    scoreChange: 0,
    interviewChange: 0,
  });
  const [recentResults, setRecentResults] = useState<InterviewResult[]>([]);
  const [scoreHistory, setScoreHistory] = useState<
    { date: string; score: number }[]
  >([]);
  const [avgCompetency, setAvgCompetency] = useState<
    { subject: string; score: number }[]
  >([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Use demo data if not logged in
        setDemoData();
        return;
      }

      // Fetch interview results with sessions
      const { data: results } = await supabase
        .from("interview_results")
        .select(
          `
          *,
          interview_sessions (*)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!results || results.length === 0) {
        setDemoData();
        return;
      }

      // Calculate stats
      const totalInterviews = results.length;
      const averageScore =
        results.reduce((sum, r) => sum + r.overall_score, 0) / totalInterviews;

      // Calculate this week count
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekCount = results.filter(
        (r) => new Date(r.created_at) >= oneWeekAgo
      ).length;

      // Calculate total minutes (estimate based on turn count)
      const totalMinutes = results.reduce((sum, r) => {
        const turns = r.interview_sessions?.turn_count || 5;
        return sum + turns * 2; // ~2 minutes per turn
      }, 0);

      // Score history for chart
      const history = results
        .slice(0, 7)
        .reverse()
        .map((r) => ({
          date: new Date(r.created_at).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          }),
          score: r.overall_score,
        }));

      // Average competency scores
      const competencyTotals: Record<string, number> = {};
      const competencyKeys = Object.keys(COMPETENCY_LABELS) as Array<
        keyof CompetencyScores
      >;

      competencyKeys.forEach((key) => {
        competencyTotals[key] = 0;
      });

      results.forEach((r) => {
        if (r.competency_scores) {
          competencyKeys.forEach((key) => {
            competencyTotals[key] += r.competency_scores[key] || 0;
          });
        }
      });

      const avgCompetencyData = competencyKeys.map((key) => ({
        subject: COMPETENCY_LABELS[key],
        score: Math.round(competencyTotals[key] / totalInterviews),
      }));

      setStats({
        totalInterviews,
        averageScore: Math.round(averageScore * 10) / 10,
        totalMinutes,
        thisWeekCount,
        scoreChange: results.length >= 2 ? results[0].overall_score - results[1].overall_score : 0,
        interviewChange: thisWeekCount,
      });
      setRecentResults(results.slice(0, 5));
      setScoreHistory(history);
      setAvgCompetency(avgCompetencyData);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoData = () => {
    // Demo data for users without interview history
    setStats({
      totalInterviews: 0,
      averageScore: 0,
      totalMinutes: 0,
      thisWeekCount: 0,
      scoreChange: 0,
      interviewChange: 0,
    });
    setRecentResults([]);
    setScoreHistory([]);
    setAvgCompetency([
      { subject: "행동역량", score: 0 },
      { subject: "명확성", score: 0 },
      { subject: "이해력", score: 0 },
      { subject: "커뮤니케이션", score: 0 },
      { subject: "논리적사고", score: 0 },
      { subject: "문제해결", score: 0 },
      { subject: "리더십", score: 0 },
      { subject: "적응력", score: 0 },
    ]);
    setIsLoading(false);
  };

  const getJobLabel = (value: string) => {
    return JOB_TYPES.find((j) => j.value === value)?.label || value;
  };

  const getPassStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            합격
          </span>
        );
      case "borderline":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
            보류
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
            불합격
          </span>
        );
    }
  };

  const statsConfig = [
    {
      label: "총 면접 횟수",
      value: stats.totalInterviews,
      suffix: "회",
      icon: Target,
      change: `+${stats.interviewChange}`,
      color: "mint",
    },
    {
      label: "평균 점수",
      value: stats.averageScore,
      suffix: "점",
      icon: TrendingUp,
      change: stats.scoreChange >= 0 ? `+${stats.scoreChange}` : `${stats.scoreChange}`,
      color: "soft-blue",
    },
    {
      label: "총 연습 시간",
      value: Math.round(stats.totalMinutes / 60 * 10) / 10,
      suffix: "시간",
      icon: Clock,
      change: "",
      color: "mint",
    },
    {
      label: "이번 주 면접",
      value: stats.thisWeekCount,
      suffix: "회",
      icon: Calendar,
      change: "",
      color: "soft-blue",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mint" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            대시보드
          </h1>
          <p className="text-muted-foreground">
            면접 연습 현황과 성장 추이를 확인하세요
          </p>
        </div>
        <Link href="/interview/setup">
          <Button variant="mint" size="lg" className="gap-2">
            <Play className="w-5 h-5" />
            면접 시작하기
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsConfig.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl ${
                    stat.color === "mint" ? "bg-mint/10" : "bg-soft-blue/10"
                  } flex items-center justify-center`}
                >
                  <stat.icon
                    className={`w-6 h-6 ${
                      stat.color === "mint" ? "text-mint" : "text-soft-blue"
                    }`}
                  />
                </div>
                {stat.change && (
                  <span
                    className={`text-sm font-medium ${
                      stat.color === "mint" ? "text-mint" : "text-soft-blue"
                    }`}
                  >
                    {stat.change}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-muted-foreground">{stat.suffix}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Score Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-6">
              점수 추이
            </h2>
            {scoreHistory.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#9CA3AF", fontSize: 12 }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#F3F4F6" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#00D9A5"
                      strokeWidth={3}
                      dot={{ fill: "#00D9A5", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#00D9A5" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                면접 기록이 없습니다. 첫 면접을 시작해보세요!
              </div>
            )}
          </Card>
        </motion.div>

        {/* Competency Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-6">
              평균 역량 분석
            </h2>
            {stats.totalInterviews > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={avgCompetency}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "#6B7280", fontSize: 10 }}
                    />
                    <Radar
                      name="평균 점수"
                      dataKey="score"
                      stroke="#00D9A5"
                      fill="#00D9A5"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                역량 분석 데이터가 없습니다
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Start Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card className="p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-mint/5 to-soft-blue/5" />
            <div className="relative">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                빠른 시작
              </h2>
              <p className="text-muted-foreground mb-6">
                AI 면접관과 실전처럼 연습해보세요. 실시간 음성 대화로 면접
                역량을 향상시킬 수 있습니다.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link href="/interview/setup">
                  <div className="p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-mint/50 transition-colors cursor-pointer group">
                    <div className="w-14 h-14 rounded-2xl bg-mint/10 flex items-center justify-center mb-4 group-hover:bg-mint/20 transition-colors">
                      <Mic className="w-7 h-7 text-mint" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      AI 모의면접
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      3명의 면접관과 실전 연습
                    </p>
                  </div>
                </Link>
                <Link href="/interview/setup">
                  <div className="p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-soft-blue/50 transition-colors cursor-pointer group">
                    <div className="w-14 h-14 rounded-2xl bg-soft-blue/10 flex items-center justify-center mb-4 group-hover:bg-soft-blue/20 transition-colors">
                      <FileText className="w-7 h-7 text-soft-blue" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      이력서 기반 면접
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      이력서 분석 맞춤 질문
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-foreground">
                최근 면접
              </h2>
              {recentResults.length > 0 && (
                <Link
                  href="/dashboard/history"
                  className="text-sm text-mint hover:underline flex items-center gap-1"
                >
                  전체 보기
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            {recentResults.length > 0 ? (
              <div className="space-y-3">
                {recentResults.map((result) => (
                  <Link key={result.id} href={`/dashboard/${result.session_id}`}>
                    <div className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                          {getJobLabel(
                            result.interview_sessions?.job_type || ""
                          )}
                        </span>
                        <span className="text-sm font-bold text-mint">
                          {result.overall_score}점
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(result.created_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </span>
                        {getPassStatusBadge(result.pass_status)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-sm">
                  아직 면접 기록이 없습니다
                </p>
                <Link href="/interview/setup" className="mt-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    첫 면접 시작하기
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
