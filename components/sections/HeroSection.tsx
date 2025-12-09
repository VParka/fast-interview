"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Mic, Brain, BarChart3 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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
  { icon: Mic, label: "실시간 음성" },
  { icon: Brain, label: "5축 핵심 역량 분석" },
  { icon: BarChart3, label: "2초 미만 응답" },
];

export function HeroSection() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleTryNow = () => {
    if (isAuthenticated) {
      router.push("/interview");
    } else {
      router.push("/login?redirect=/interview");
    }
  };

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

      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center pt-8 sm:pt-12">
          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-4 sm:mb-6 px-2"
          >
            <span className="text-foreground">AI 모의 면접으로</span>
            <br />
            <span className="text-gradient-mint">지금 시작하세요</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 text-balance px-4"
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
            className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 sm:mb-12 px-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50 touch-target"
              >
                <feature.icon className="w-3 h-3 sm:w-4 sm:h-4 text-mint flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
                  {feature.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex justify-center px-4"
          >
            <Button
              variant="hero"
              size="xl"
              onClick={handleTryNow}
              className="group px-12 sm:px-16 py-5 sm:py-6 text-lg sm:text-xl font-semibold"
            >
              <Play className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" />
              Try Now
              <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>

        {/* AI Avatars Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-12 sm:mt-16 md:mt-20 relative"
        >
          <div className="relative max-w-4xl mx-auto">
            {/* Glass Container */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-mint/5 to-transparent" />

              {/* Avatar Grid */}
              <div className="relative grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
                    <div className="relative mb-3 sm:mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-xl sm:rounded-2xl bg-gradient-to-br from-mint/20 to-soft-blue/20 border border-border/50 flex items-center justify-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl md:text-4xl">
                            {index === 0 ? "👨‍💼" : index === 1 ? "👩‍💻" : "👨‍🔬"}
                          </span>
                        </div>
                      </div>
                      {/* Voice Indicator */}
                      <motion.div
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-mint/20 border border-mint/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <VoiceWave />
                      </motion.div>
                    </div>
                    <h3 className="font-semibold text-foreground text-xs sm:text-sm md:text-base text-center px-1">
                      {avatar.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground text-center">
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
                className="mt-6 sm:mt-8 flex justify-center"
              >
                <div className="glass px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl inline-flex items-center gap-2 sm:gap-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-mint rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
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
