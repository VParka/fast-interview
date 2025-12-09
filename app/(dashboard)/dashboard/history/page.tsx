"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MessageCircle,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Loader2,
  FileText,
  Search,
  Filter,
  BarChart3,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { JOB_TYPES, INTERVIEWER_BASE, type InterviewerType } from "@/types/interview";

interface Message {
  id: string;
  session_id: string;
  role: "user" | "interviewer" | "system";
  interviewer_id?: string;
  content: string;
  created_at: string;
}

interface InterviewSession {
  id: string;
  job_type: string;
  difficulty: string;
  status: string;
  turn_count: number;
  created_at: string;
  messages?: Message[];
}

interface InterviewResult {
  id: string;
  session_id: string;
  overall_score: number;
  pass_status: string;
  created_at: string;
}

export default function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [results, setResults] = useState<Record<string, InterviewResult>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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
        await Promise.race([fetchHistory(), timeoutPromise]);
      } catch (error) {
        console.error('History data load error:', error);
        if (isMounted) {
          setSessions([]);
          setResults({});
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // 캐시된 세션 사용 (getUser보다 빠름)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setSessions([]);
        setResults({});
        setIsLoading(false);
        return;
      }

      const user = session.user;

      // Fetch all completed sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["completed", "active"])
        .order("created_at", { ascending: false });

      if (sessionsError) {
        console.error("Sessions fetch error:", sessionsError);
        setSessions([]);
        setResults({});
        setIsLoading(false);
        return;
      }

      // Always set sessions (even if empty)
      const sessions = (sessionsData || []) as InterviewSession[];
      setSessions(sessions);

      if (sessions.length > 0) {
        // Fetch results for each session
        const sessionIds = sessions.map((s) => s.id);
        const { data: resultsData } = await supabase
          .from("interview_results")
          .select("*")
          .in("session_id", sessionIds);

        if (resultsData) {
          const results = resultsData as InterviewResult[];
          const resultsMap: Record<string, InterviewResult> = {};
          results.forEach((r) => {
            resultsMap[r.session_id] = r;
          });
          setResults(resultsMap);
        }
      } else {
        setResults({});
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setSessions([]);
      setResults({});
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (messages) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, messages } : s
          )
        );
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleToggleExpand = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      // Fetch messages if not already loaded
      const session = sessions.find((s) => s.id === sessionId);
      if (session && !session.messages) {
        await fetchMessages(sessionId);
      }
    }
  };

  const handleDelete = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      // Delete the session - CASCADE will automatically delete messages and results
      const { error } = await supabase
        .from("interview_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      // Update local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setResults((prev) => {
        const newResults = { ...prev };
        delete newResults[sessionId];
        return newResults;
      });

      toast.success("면접 기록 및 리포트가 삭제되었습니다");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("삭제 중 오류가 발생했습니다");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
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

  const getDifficultyColor = (value: string) => {
    const colors: Record<string, string> = {
      easy: "bg-green-500/20 text-green-400",
      medium: "bg-amber-500/20 text-amber-400",
      hard: "bg-red-500/20 text-red-400",
    };
    return colors[value] || "bg-secondary text-foreground";
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

  const getInterviewerInfo = (interviewerId?: string) => {
    if (!interviewerId) return null;
    const interviewer = INTERVIEWER_BASE[interviewerId as InterviewerType];
    return interviewer || null;
  };

  const filteredSessions = sessions.filter((session) => {
    // Filter by difficulty
    if (filterDifficulty !== "all" && session.difficulty !== filterDifficulty) {
      return false;
    }
    // Filter by search query (job type)
    if (searchQuery) {
      const jobLabel = getJobLabel(session.job_type).toLowerCase();
      if (!jobLabel.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

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
            면접 기록
          </h1>
          <p className="text-muted-foreground">
            이전 면접의 대화 내용을 확인하세요
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="직무로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-mint/50"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-foreground focus:outline-none focus:border-mint/50"
          >
            <option value="all">전체 난이도</option>
            <option value="easy">초급</option>
            <option value="medium">중급</option>
            <option value="hard">고급</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            면접 기록이 없습니다
          </h2>
          <p className="text-muted-foreground mb-6">
            첫 면접을 시작하고 기록을 확인해보세요
          </p>
          <Link href="/interview/setup">
            <Button variant="mint" className="gap-2">
              면접 시작하기
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session, index) => {
            const result = results[session.id];
            const isExpanded = expandedSession === session.id;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  {/* Session Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => handleToggleExpand(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-mint/10 flex items-center justify-center">
                          <MessageCircle className="w-6 h-6 text-mint" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">
                              {getJobLabel(session.job_type)}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(
                                session.difficulty
                              )}`}
                            >
                              {getDifficultyLabel(session.difficulty)}
                            </span>
                            {result && getPassStatusBadge(result.pass_status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(session.created_at).toLocaleDateString(
                                "ko-KR"
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.turn_count}턴
                            </span>
                            {result && (
                              <span className="flex items-center gap-1 text-mint">
                                <BarChart3 className="w-4 h-4" />
                                {result.overall_score}점
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {result && (
                          <Link
                            href={`/dashboard/${session.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="outline" size="sm" className="gap-1">
                              리포트
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(session.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-border/50"
                      >
                        <div className="p-6 bg-secondary/20 max-h-[500px] overflow-y-auto">
                          {session.messages ? (
                            <div className="space-y-4">
                              {session.messages.map((message) => {
                                const interviewer = getInterviewerInfo(
                                  message.interviewer_id
                                );
                                const isUser = message.role === "user";

                                return (
                                  <div
                                    key={message.id}
                                    className={`flex gap-3 ${
                                      isUser ? "flex-row-reverse" : ""
                                    }`}
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        isUser
                                          ? "bg-mint/20"
                                          : "bg-soft-blue/20"
                                      }`}
                                    >
                                      {isUser ? (
                                        <User className="w-4 h-4 text-mint" />
                                      ) : interviewer ? (
                                        <span className="text-sm">
                                          {interviewer.emoji}
                                        </span>
                                      ) : (
                                        <Bot className="w-4 h-4 text-soft-blue" />
                                      )}
                                    </div>
                                    <div
                                      className={`flex-1 max-w-[80%] ${
                                        isUser ? "text-right" : ""
                                      }`}
                                    >
                                      {!isUser && interviewer && (
                                        <p className="text-xs text-muted-foreground mb-1">
                                          {interviewer.name} ({interviewer.role})
                                        </p>
                                      )}
                                      <div
                                        className={`inline-block px-4 py-3 rounded-2xl ${
                                          isUser
                                            ? "bg-mint/20 text-foreground"
                                            : "bg-secondary/50 text-foreground"
                                        }`}
                                      >
                                        <p className="text-sm whitespace-pre-wrap">
                                          {message.content}
                                        </p>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(
                                          message.created_at
                                        ).toLocaleTimeString("ko-KR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-mint" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-md mx-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">면접 기록 삭제</h2>
              <p className="text-muted-foreground mb-6">
                이 면접 기록을 삭제하시겠습니까?
                <br />
                <span className="text-destructive font-semibold">
                  관련 리포트도 함께 삭제됩니다.
                </span>
                <br />
                <span className="text-xs">이 작업은 되돌릴 수 없습니다.</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  삭제
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
