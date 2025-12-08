"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Mic, Brain, BarChart3 } from "lucide-react";
import Link from "next/link";

// Voice wave component that only animates on client
function VoiceWave() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fixed heights for SSR, animated heights for client
  const heights = mounted
    ? [8, 12, 16, 10, 14]
    : [10, 10, 10, 10, 10];

  return (
    <div className="voice-wave">
      {heights.map((baseHeight, i) => (
        <motion.span
          key={i}
          animate={mounted ? {
            height: [baseHeight, baseHeight + 6, baseHeight, baseHeight + 4, baseHeight]
          } : undefined}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
          style={{ height: `${baseHeight}px` }}
        />
      ))}
    </div>
  );
}

const features = [
  { icon: Mic, label: "Real-time Voice" },
  { icon: Brain, label: "8-Core Evaluation" },
  { icon: BarChart3, label: "<2s Latency" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-mint/20 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-soft-blue/20 blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>

      <div className="container relative mx-auto px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              AI-Powered Interview System
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">AI Multi-Interviewer</span>
            <br />
            <span className="text-gradient-mint">Mock Interview</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance"
          >
            3인의 AI 면접관이 실시간 음성으로 다각도 역량을 평가합니다.
            <br className="hidden sm:block" />
            실전과 동일한 압박감, 즉각적인 피드백으로 면접 실력을 극대화하세요.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50"
              >
                <feature.icon className="w-4 h-4 text-mint" />
                <span className="text-sm font-medium text-foreground">
                  {feature.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link href="/interview">
              <Button variant="hero" size="xl" className="group">
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Try Demo
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="hero-outline" size="xl">
              View Case Study
            </Button>
          </motion.div>
        </div>

        {/* AI Avatars Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-20 relative"
        >
          <div className="relative max-w-4xl mx-auto">
            {/* Glass Container */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-mint/5 to-transparent" />

              {/* Avatar Grid */}
              <div className="relative grid grid-cols-3 gap-6">
                {[
                  { name: "실무팀장", role: "Technical Lead", delay: 0 },
                  { name: "HR 담당자", role: "HR Manager", delay: 0.2 },
                  { name: "시니어 동료", role: "Senior Peer", delay: 0.4 },
                ].map((avatar, index) => (
                  <motion.div
                    key={avatar.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1 + avatar.delay }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-4">
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-mint/20 to-soft-blue/20 border border-border/50 flex items-center justify-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl">
                            {index === 0 ? "👨‍💼" : index === 1 ? "👩‍💻" : "👨‍🔬"}
                          </span>
                        </div>
                      </div>
                      {/* Voice Indicator */}
                      <motion.div
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-mint/20 border border-mint/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <VoiceWave />
                      </motion.div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      {avatar.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {avatar.role}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Typing Indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="mt-8 flex justify-center"
              >
                <div className="glass px-6 py-3 rounded-2xl inline-flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-mint rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    AI가 질문을 준비하고 있습니다...
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
        >
          <motion.div className="w-1 h-2 rounded-full bg-mint" />
        </motion.div>
      </motion.div>
    </section>
  );
}
