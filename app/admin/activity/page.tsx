"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Activity,
  X,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionLogs } from "@/lib/admin/api";
import type { SessionLog, PaginatedResponse } from "@/types/admin";

/**
 * 활동 로그 페이지
 * - 탭: 시스템 에러 | API 요청 | 면접 세션
 * - 날짜/유저 필터
 * - 상세 모달
 */

type TabType = "sessions" | "errors" | "api";

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "sessions", label: "면접 세션", icon: MessageSquare },
  { id: "errors", label: "시스템 에러", icon: AlertTriangle },
  { id: "api", label: "API 요청", icon: Activity },
];

export default function AdminActivityPage() {
  const [activeTab, setActiveTab] = useState<TabType>("sessions");
  const [logs, setLogs] = useState<PaginatedResponse<SessionLog> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const limit = 15;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === "sessions") {
        const data = await getSessionLogs({
          page: currentPage,
          limit,
          search: searchQuery || undefined,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        });
        setLogs(data);
      } else {
        setLogs({
          data: [],
          total: 0,
          page: 1,
          limit,
          totalPages: 0,
        });
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, searchQuery, dateRange]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadLogs();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: "bg-green-500/10 text-green-400 border-green-500/20",
      active: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      waiting: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      abandoned: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    const labels: Record<string, string> = {
      completed: "완료",
      active: "진행중",
      paused: "일시정지",
      waiting: "대기",
      abandoned: "중단",
    };
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
          styles[status] || styles.waiting
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">활동 로그</h1>
        <p className="text-slate-400">시스템 활동 기록을 확인하세요</p>
      </div>

      <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-mint text-slate-900"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              type="text"
              placeholder="이메일로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-slate-800/50 border-slate-700"
            />
          </div>
          <Button type="submit" variant="outline" className="border-slate-700">
            검색
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="w-40 bg-slate-800/50 border-slate-700"
          />
          <span className="text-slate-500">~</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            className="w-40 bg-slate-800/50 border-slate-700"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">유저</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">직무</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">난이도</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">턴 수</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">상태</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">시작 시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-mint border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : activeTab !== "sessions" ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    이 탭은 아직 준비 중입니다
                  </td>
                </tr>
              ) : logs?.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    로그가 없습니다
                  </td>
                </tr>
              ) : (
                logs?.data.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-slate-300">{log.user_email}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{log.job_type}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {log.difficulty === "easy" ? "초급" : log.difficulty === "medium" ? "중급" : "고급"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{log.turn_count}턴</td>
                    <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(log.created_at).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {logs && logs.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
            <p className="text-sm text-slate-400">
              {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, logs.total)} of {logs.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === logs.totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">세션 상세</h3>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <UserIcon className="w-4 h-4" />
                      <span className="text-xs">유저</span>
                    </div>
                    <p className="text-sm font-medium text-white truncate">{selectedLog.user_email}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs">직무</span>
                    </div>
                    <p className="text-sm font-medium text-white">{selectedLog.job_type}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs">턴 수</span>
                    </div>
                    <p className="text-sm font-medium text-mint">{selectedLog.turn_count}턴</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">시작 시간</span>
                    </div>
                    <p className="text-sm font-medium text-white">{new Date(selectedLog.created_at).toLocaleString("ko-KR")}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-700/30">
                  <p className="text-xs text-slate-400 mb-1">세션 ID</p>
                  <code className="text-xs text-mint break-all">{selectedLog.id}</code>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
