"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Activity, MessageSquare, Target } from "lucide-react";

// 5축 핵심 역량 데이터
const radarData = [
  { axis: "논리적 구조", score: 85, fullMark: 100 },
  { axis: "직무 전문성", score: 78, fullMark: 100 },
  { axis: "태도/커뮤니케이션", score: 92, fullMark: 100 },
  { axis: "회사 적합도", score: 82, fullMark: 100 },
  { axis: "성장 가능성", score: 88, fullMark: 100 },
];

const emotionData = [
  { time: "0:00", confidence: 60, enthusiasm: 70, tension: 40 },
  { time: "5:00", confidence: 65, enthusiasm: 75, tension: 35 },
  { time: "10:00", confidence: 72, enthusiasm: 80, tension: 30 },
  { time: "15:00", confidence: 78, enthusiasm: 82, tension: 28 },
  { time: "20:00", confidence: 85, enthusiasm: 88, tension: 22 },
];

const growthData = [
  { session: "1회차", score: 62 },
  { session: "2회차", score: 71 },
  { session: "3회차", score: 78 },
  { session: "4회차", score: 84 },
  { session: "5회차", score: 89 },
];

const speechMetrics = [
  { label: "WPM (분당 단어)", value: "142", status: "적정", color: "mint" },
  { label: "필러워드 비율", value: "3.2%", status: "양호", color: "soft-blue" },
  { label: "침묵 시간", value: "2.1초", status: "자연스러움", color: "mint" },
  { label: "응답 완결성", value: "94%", status: "우수", color: "soft-blue" },
];

export function AnalyticsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="analytics" className="py-32 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/20 via-background to-background" />

      <div className="container relative mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-mint/10 text-mint text-sm font-medium mb-6">
            Analytics Dashboard
          </span>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            데이터 기반{" "}
            <span className="text-gradient-mint">역량 분석</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            5축 핵심 역량 분석, 감정 트래킹, 스피치 분석으로
            객관적이고 정량화된 피드백을 제공합니다.
          </p>
        </motion.div>

        {/* Main Dashboard */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-mint" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  5축 핵심 역량 분석
                </h3>
                <p className="text-sm text-muted-foreground">
                  종합 역량 점수: 82.5점
                </p>
              </div>
            </div>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Radar
                    name="역량"
                    dataKey="score"
                    stroke="hsl(var(--mint))"
                    fill="hsl(var(--mint))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Emotion Analysis */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-soft-blue/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-soft-blue" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  감정 분석 트래킹
                </h3>
                <p className="text-sm text-muted-foreground">
                  실시간 감정 변화 모니터링
                </p>
              </div>
            </div>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emotionData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--mint))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--mint))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnthusiasm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--soft-blue))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--soft-blue))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="hsl(var(--mint))"
                    fillOpacity={1}
                    fill="url(#colorConfidence)"
                    name="자신감"
                  />
                  <Area
                    type="monotone"
                    dataKey="enthusiasm"
                    stroke="hsl(var(--soft-blue))"
                    fillOpacity={1}
                    fill="url(#colorEnthusiasm)"
                    name="열정"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4">
              {[
                { label: "자신감", color: "bg-mint" },
                { label: "열정", color: "bg-soft-blue" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Speech Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-mint" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  스피치 분석
                </h3>
                <p className="text-sm text-muted-foreground">발화 패턴 상세 분석</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {speechMetrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  className="p-4 rounded-xl bg-secondary/30 border border-border/50"
                >
                  <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                  <p className="font-display text-2xl font-bold text-mint">
                    {metric.value}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-mint/10 text-mint">
                    {metric.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-soft-blue/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-soft-blue" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  성장 지수
                </h3>
                <p className="text-sm text-muted-foreground">
                  회차별 점수 변화 추이
                </p>
              </div>
            </div>

            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="session"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    domain={[50, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--soft-blue))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--soft-blue))", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, stroke: "hsl(var(--soft-blue))", strokeWidth: 2 }}
                    name="종합 점수"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-soft-blue/5 border border-soft-blue/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">5회차 성장률</span>
                <span className="text-lg font-bold text-soft-blue">+43.5%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
