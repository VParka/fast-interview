"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  MessageSquare,
  Coins,
  TrendingUp,
  Play,
  CheckCircle,
  UserPlus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAdminStats, getRecentActivity, getSessionTrendData } from "@/lib/admin/api";
import type { AdminStats, ActivityLog } from "@/types/admin";
import type { ChartDataPoint } from "@/lib/admin/api";

/**
 * Admin 대시보드 페이지
 * - 통계 카드: 유저, 면접, 크레딧
 * - 최근 활동 로그
 * - 차트: 7일간 면접/가입 트렌드
 */

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, activityData, trendData] = await Promise.all([
          getAdminStats(),
          getRecentActivity(10),
          getSessionTrendData(),
        ]);
        setStats(statsData);
        setActivities(activityData);
        setChartData(trendData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const statCards = [
    {
      label: "전체 유저",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      label: "신규 가입 (7일)",
      value: stats?.newUsersLast7Days || 0,
      icon: UserPlus,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      trend: stats?.newUsersLast7Days ? "+12%" : undefined,
      trendUp: true,
    },
    {
      label: "전체 면접 세션",
      value: stats?.totalSessions || 0,
      icon: MessageSquare,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
    },
    {
      label: "오늘 면접",
      value: stats?.todaySessions || 0,
      icon: Play,
      color: "text-mint",
      bgColor: "bg-mint/10",
      borderColor: "border-mint/20",
    },
    {
      label: "사용된 크레딧",
      value: stats?.totalCreditsUsed || 0,
      icon: Coins,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      label: "잔여 크레딧",
      value: stats?.totalCreditsRemaining || 0,
      icon: TrendingUp,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "interview_complete":
        return CheckCircle;
      case "interview_start":
        return Play;
      case "signup":
        return UserPlus;
      case "error":
        return AlertTriangle;
      default:
        return Play;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">대시보드</h1>
        <p className="text-slate-400">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-5 rounded-xl ${card.bgColor} border ${card.borderColor}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {card.trend && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    card.trendUp ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {card.trendUp ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {card.trend}
                </div>
              )}
            </div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                {card.value.toLocaleString()}
              </p>
              <p className="text-sm text-slate-400">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
        >
          <h2 className="text-lg font-semibold text-white mb-4">최근 활동</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">
                최근 활동이 없습니다
              </p>
            ) : (
              activities.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30"
                  >
                    <div className={`p-2 rounded-lg bg-slate-700/50`}>
                      <Icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {activity.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(activity.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Chart - 7일 트렌드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
        >
          <h2 className="text-lg font-semibold text-white mb-4">7일간 트렌드</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  name="면접 세션"
                  stroke="#7FFFD4"
                  strokeWidth={2}
                  dot={{ fill: "#7FFFD4", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="신규 가입"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: "#60a5fa", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
