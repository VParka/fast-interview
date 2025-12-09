"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Trophy,
  TrendingUp,
  TrendingDown,
  Loader2,
  Target,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { JOB_TYPES } from "@/types/interview";

// 5축 핵심 역량 라벨
const CATEGORY_LABELS: Record<string, string> = {
  logical_structure: "논리적 구조",
  job_expertise: "직무 전문성",
  attitude_communication: "태도/커뮤니케이션",
  company_fit: "회사 적합도",
  growth_potential: "성장 가능성",
};

interface CategoryScore {
  score: number;
  reasoning: string;
}

interface InterviewResult {
  id: string;
  session_id: string;
  overall_score: number;
  pass_status: string;
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
  created_at: string;
  interview_sessions?: {
    id: string;
    job_type: string;
    difficulty: string;
    turn_count: number;
  };
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<InterviewResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InterviewResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // Add timeout wrapper to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });

      try {
        await Promise.race([fetchResults(), timeoutPromise]);
      } catch (error) {
        console.error('Reports data load error:', error);
        if (isMounted) {
          setResults([]);
          setSelectedResult(null);
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      // 캐시된 세션 사용 (getUser보다 빠름)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setResults([]);
        setSelectedResult(null);
        setIsLoading(false);
        return;
      }

      const user = session.user;

      const { data, error } = await supabase
        .from("interview_results")
        .select(`
          *,
          interview_sessions (
            id,
            job_type,
            difficulty,
            turn_count
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Results fetch error:", error);
        setResults([]);
        setSelectedResult(null);
        setIsLoading(false);
        return;
      }

      // Always set results (even if empty)
      const resultsData = (data || []) as InterviewResult[];
      setResults(resultsData);

      if (resultsData.length > 0) {
        setSelectedResult(resultsData[0]);
      } else {
        setSelectedResult(null);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      setResults([]);
      setSelectedResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getJobLabel = (value: string) => {
    return JOB_TYPES.find((j) => j.value === value)?.label || value;
  };

  const getDifficultyLabel = (value: string) => {
    const labels: Record<string, string> = {
      easy: "초급",
      medium: "중급",
      hard: "고급",
    };
    return labels[value] || value;
  };

  const getPassStatusConfig = (status: string) => {
    switch (status) {
      case "pass":
        return {
          label: "합격",
          color: "text-green-500",
          bg: "bg-green-500/10",
          icon: CheckCircle2,
        };
      case "borderline":
        return {
          label: "보류",
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          icon: AlertCircle,
        };
      default:
        return {
          label: "불합격",
          color: "text-red-500",
          bg: "bg-red-500/10",
          icon: XCircle,
        };
    }
  };

  const getRadarData = (scores?: InterviewResult["category_scores"]) => {
    if (!scores) return [];
    return Object.entries(scores).map(([key, value]) => ({
      subject: CATEGORY_LABELS[key] || key,
      value: Math.round(((value.score - 1) / 4) * 100), // Convert 1-5 to 0-100
      fullMark: 100,
    }));
  };

  const handleDelete = async (result: InterviewResult) => {
    setIsDeleting(true);
    try {
      const sessionId = result.session_id;

      // Delete the session - CASCADE will automatically delete messages and results
      const { error } = await supabase
        .from("interview_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      // Update local state
      const updatedResults = results.filter((r) => r.id !== result.id);
      setResults(updatedResults);

      // Update selected result if it was deleted
      if (selectedResult?.id === result.id) {
        setSelectedResult(updatedResults.length > 0 ? updatedResults[0] : null);
      }

      toast.success("리포트 및 면접 기록이 삭제되었습니다");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("삭제 중 오류가 발생했습니다");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

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
            분석 리포트
          </h1>
          <p className="text-muted-foreground">
            면접별 상세 분석 결과를 확인하세요
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <Card className="p-12 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            분석 리포트가 없습니다
          </h2>
          <p className="text-muted-foreground mb-6">
            면접을 완료하면 상세 분석 리포트를 확인할 수 있습니다
          </p>
          <Link href="/interview/setup">
            <Button variant="mint" className="gap-2">
              면접 시작하기
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Results List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-foreground mb-4">리포트 목록</h2>
            <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              {results.map((result, index) => {
                const status = getPassStatusConfig(result.pass_status);
                const isSelected = selectedResult?.id === result.id;

                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-mint/50 bg-mint/5"
                          : "hover:border-border hover:bg-secondary/30"
                      }`}
                      onClick={() => setSelectedResult(result)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground text-sm">
                          {result.interview_sessions
                            ? getJobLabel(result.interview_sessions.job_type)
                            : "면접"}
                        </span>
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}
                        >
                          <status.icon className="w-3 h-3" />
                          <span className="text-xs font-medium">
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(result.created_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-mint">
                            {result.overall_score}점
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(result);
                            }}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Selected Result Detail */}
          {selectedResult && (
            <div className="lg:col-span-2 space-y-6">
              {/* Score Overview */}
              <motion.div
                key={selectedResult.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {selectedResult.interview_sessions
                          ? getJobLabel(selectedResult.interview_sessions.job_type)
                          : "면접"}{" "}
                        결과
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedResult.created_at).toLocaleDateString(
                          "ko-KR",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}{" "}
                        ·{" "}
                        {selectedResult.interview_sessions
                          ? getDifficultyLabel(
                              selectedResult.interview_sessions.difficulty
                            )
                          : ""}{" "}
                        ·{" "}
                        {selectedResult.interview_sessions?.turn_count || 0}턴
                      </p>
                    </div>
                    <Link href={`/dashboard/${selectedResult.session_id}`}>
                      <Button variant="mint" size="sm" className="gap-1">
                        상세보기
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    {/* Overall Score */}
                    <div className="p-4 rounded-xl bg-mint/10 border border-mint/20">
                      <p className="text-xs text-muted-foreground mb-1">
                        종합 점수
                      </p>
                      <p className="font-display text-3xl font-bold text-mint">
                        {selectedResult.overall_score}
                      </p>
                    </div>

                    {/* Status */}
                    <div
                      className={`p-4 rounded-xl ${
                        getPassStatusConfig(selectedResult.pass_status).bg
                      } border border-${
                        getPassStatusConfig(selectedResult.pass_status).color
                      }/20`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        결과
                      </p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const StatusIcon = getPassStatusConfig(
                            selectedResult.pass_status
                          ).icon;
                          return (
                            <StatusIcon
                              className={`w-6 h-6 ${
                                getPassStatusConfig(selectedResult.pass_status)
                                  .color
                              }`}
                            />
                          );
                        })()}
                        <span
                          className={`font-display text-xl font-bold ${
                            getPassStatusConfig(selectedResult.pass_status)
                              .color
                          }`}
                        >
                          {getPassStatusConfig(selectedResult.pass_status).label}
                        </span>
                      </div>
                    </div>

                    {/* Rank */}
                    <div className="p-4 rounded-xl bg-soft-blue/10 border border-soft-blue/20">
                      <p className="text-xs text-muted-foreground mb-1">
                        순위
                      </p>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-soft-blue" />
                        <span className="font-display text-xl font-bold text-soft-blue">
                          상위 {selectedResult.rank_percentile
                            ? 100 - selectedResult.rank_percentile
                            : "-"}%
                        </span>
                      </div>
                    </div>

                    {/* Growth */}
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">
                        성장지수
                      </p>
                      <div className="flex items-center gap-2">
                        {(selectedResult.growth_index ?? 0) >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <span
                          className={`font-display text-xl font-bold ${
                            (selectedResult.growth_index ?? 0) >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {(selectedResult.growth_index ?? 0) >= 0 ? "+" : ""}
                          {selectedResult.growth_index ?? 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* 5-Axis Competency */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Target className="w-5 h-5 text-mint" />
                    <h2 className="font-display text-lg font-bold text-foreground">
                      5축 핵심 역량 분석
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Radar Chart */}
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          data={getRadarData(selectedResult.category_scores)}
                        >
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 11,
                            }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{
                              fill: "hsl(var(--muted-foreground))",
                              fontSize: 10,
                            }}
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
                      {selectedResult.category_scores && Object.entries(selectedResult.category_scores)
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
                                  className={`h-full ${
                                    percentValue >= 70
                                      ? "bg-mint"
                                      : percentValue >= 50
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
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
                </Card>
              </motion.div>

              {/* Feedback Summary */}
              {selectedResult.feedback_summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card className="p-6">
                    <h2 className="font-display text-lg font-bold text-foreground mb-4">
                      피드백 요약
                    </h2>
                    <p className="text-foreground leading-relaxed">
                      {selectedResult.feedback_summary}
                    </p>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  리포트 삭제
                </h3>
              </div>
              <p className="text-muted-foreground mb-2">
                이 리포트를 삭제하시겠습니까?
              </p>
              <p className="text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg mb-6">
                ⚠️ 리포트 삭제 시 연결된 면접 기록도 함께 삭제됩니다.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    "삭제"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
