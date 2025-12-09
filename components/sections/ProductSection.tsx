"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AlertCircle, CheckCircle2, ArrowRight, Zap, Users, TrendingUp } from "lucide-react";

const painPoints = [
  {
    icon: Users,
    title: "면접 연습 기회 부족",
    before: "실제 면접 전까지 연습 기회가 거의 없음",
    after: "24/7 무제한 면접 연습 가능",
  },
  {
    icon: TrendingUp,
    title: "객관적 피드백 부재",
    before: "주관적이고 추상적인 피드백만 수령",
    after: "5축 역량 분석 + 수치화된 성장 지표",
  },
  {
    icon: Zap,
    title: "다양한 면접관 경험 불가",
    before: "단일 관점의 면접 준비",
    after: "3인 AI 면접관의 다각도 질문",
  },
];

export function ProductSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="product" className="py-32 relative overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />

      <div className="container relative mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-mint/10 text-mint text-sm font-medium mb-6">
            Product Concept
          </span>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            면접 준비의{" "}
            <span className="text-gradient-mint">패러다임을 바꾸다</span>
          </h2>
          <p className="text-lg text-muted-foreground text-balance">
            기존 면접 준비의 한계를 AI 기술로 혁신합니다.
            실시간 음성 인터랙션과 데이터 기반 피드백으로
            실전과 동일한 경험을 제공합니다.
          </p>
        </motion.div>

        {/* Pain Points Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="glass-card rounded-2xl p-8 hover-lift group"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-mint/10 flex items-center justify-center mb-6 group-hover:bg-mint/20 transition-colors">
                <point.icon className="w-7 h-7 text-mint" />
              </div>

              <h3 className="font-display text-xl font-semibold mb-6 text-foreground">
                {point.title}
              </h3>

              {/* Before/After Comparison */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-destructive block mb-1">Before</span>
                    <p className="text-sm text-muted-foreground">{point.before}</p>
                  </div>
                </div>

                <motion.div
                  className="flex justify-center"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5 text-mint rotate-90" />
                </motion.div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-mint/5 border border-mint/20">
                  <CheckCircle2 className="w-5 h-5 text-mint shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-mint block mb-1">After</span>
                    <p className="text-sm text-foreground font-medium">{point.after}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="glass-card rounded-3xl p-10 lg:p-16"
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: "2초", label: "응답 지연시간", suffix: "미만" },
              { value: "5가지", label: "역량 분석 축", suffix: "" },
              { value: "3인", label: "AI 면접관", suffix: "동시 진행" },
              { value: "24/7", label: "연습 가능", suffix: "언제든지" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="font-display text-4xl lg:text-5xl font-bold text-gradient-mint">
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                  )}
                </div>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
