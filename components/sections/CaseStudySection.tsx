"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowRight, Star, Quote, TrendingUp, Award } from "lucide-react";

const progressData = [
  { session: "1회차", before: 58, after: 58 },
  { session: "2회차", before: 58, after: 68 },
  { session: "3회차", before: 58, after: 76 },
  { session: "4회차", before: 58, after: 84 },
  { session: "5회차", before: 58, after: 91 },
];

const testimonials = [
  {
    name: "김OO",
    role: "네이버 백엔드 개발자",
    image: "👨‍💻",
    content: "실제 면접보다 더 압박감 있는 연습이었어요. 3인의 면접관이 돌아가며 질문하니 실전 감각이 확실히 올랐습니다.",
    rating: 5,
    improvement: "+33점",
  },
  {
    name: "이OO",
    role: "카카오 PM",
    image: "👩‍💼",
    content: "5축 분석 덕분에 제 약점이 '논리적 구조'라는 걸 알았어요. 집중 연습 후 면접에서 좋은 피드백을 받았습니다.",
    rating: 5,
    improvement: "+28점",
  },
  {
    name: "박OO",
    role: "토스 프론트엔드",
    image: "👨‍🎨",
    content: "감정 분석 그래프를 보고 제가 긴장할 때 말이 빨라진다는 걸 처음 알았어요. 메타인지가 정말 중요하더라고요.",
    rating: 5,
    improvement: "+41점",
  },
];

export function CaseStudySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <section id="case-study" className="py-32 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-background to-background" />

      <div className="container relative mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-soft-blue/20 text-soft-blue text-sm font-medium mb-6">
            Case Study
          </span>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            실제 사용자들의{" "}
            <span className="text-gradient-blue">성장 스토리</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            IMSAM을 통해 면접 역량을 향상시킨 사용자들의
            실제 데이터와 후기를 확인하세요.
          </p>
        </motion.div>

        {/* Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <div className="glass-card rounded-3xl p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  5회차 연습 후 점수 변화
                </h3>
                <p className="text-muted-foreground">
                  평균 사용자 기준 종합 역량 점수 변화 추이
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Before</p>
                  <p className="font-display text-3xl font-bold text-muted-foreground">58점</p>
                </div>
                <ArrowRight className="w-6 h-6 text-mint" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">After</p>
                  <p className="font-display text-3xl font-bold text-gradient-mint">91점</p>
                </div>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="session"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    domain={[40, 100]}
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
                    dataKey="before"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="시작 점수"
                  />
                  <Line
                    type="monotone"
                    dataKey="after"
                    stroke="hsl(var(--mint))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--mint))", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, stroke: "hsl(var(--mint))", strokeWidth: 2 }}
                    name="현재 점수"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-border/50">
              {[
                { label: "평균 향상 점수", value: "+33점", icon: TrendingUp },
                { label: "합격률 증가", value: "+67%", icon: Award },
                { label: "평균 연습 시간", value: "4.2h", icon: Star },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="w-6 h-6 text-mint mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h3 className="font-display text-2xl font-bold text-foreground text-center mb-12">
            사용자 후기
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                onMouseEnter={() => setActiveTestimonial(index)}
                className={`glass-card rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                  activeTestimonial === index
                    ? "ring-2 ring-soft-blue shadow-lg"
                    : ""
                }`}
              >
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-soft-blue/30 mb-4" />

                {/* Content */}
                <p className="text-foreground mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-soft-blue text-soft-blue" />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-mint/10 text-mint text-sm font-bold">
                    {testimonial.improvement}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
