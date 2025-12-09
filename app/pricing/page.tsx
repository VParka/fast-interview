"use client";

import { motion } from "framer-motion";
import { PricingSection } from "@/components/pricing/PricingSection";
import { ComparisonFeatureMatrix } from "@/components/pricing/ComparisonFeatureMatrix";
import { Navigation } from "@/components/layout/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-foreground selection:bg-mint/30">
      <Navigation />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative py-20 px-4 flex flex-col items-center justify-center min-h-[50vh]">
          {/* Background Gradients */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-ring" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-[0.03]" />
          </div>

          <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-mint mb-4"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-mint"></span>
              </span>
              무한한 잠재력
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] text-balance"
            >
              당신의 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint via-white to-soft-blue animate-gradient-shift bg-[length:200%_auto]">
                언어적 잠재력을 깨우세요.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              상위 1% 면접관의 시선을 가진 AI와 함께,<br />
              완벽 그 이상의 답변을 준비하십시오.
            </motion.p>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <PricingSection />

        {/* Feature Comparison Matrix */}
        <ComparisonFeatureMatrix />

        {/* FAQ Section (Simple for now) */}
        <section className="py-24 px-4 bg-[#0A0A0F] border-t border-white/5">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-display font-bold text-white mb-4">자주 묻는 질문 (FAQ)</h2>
              <p className="text-slate-400">모든 궁금증을 여기서 해결하세요.</p>
            </div>
            
            <div className="space-y-4">
              {[
                { q: "Free 플랜은 정말 평생 무료인가요?", a: "네, Seed 플랜은 기본적인 면접 감각을 유지하고 싶은 분들을 위해 평생 무료로 제공됩니다." },
                { q: "언제든지 플랜을 변경하거나 취소할 수 있나요?", a: "네, 대시보드 설정에서 언제든지 멤버십을 업그레이드, 다운그레이드하거나 취소할 수 있습니다. 이미 결제된 금액에 대해서는 잔여 기간만큼 일할 계산되어 처리됩니다." },
                { q: "기업용(Forest) 플랜은 어떤 점이 다른가요?", a: "기업용 플랜은 우리 회사의 인재상에 맞춘 커스텀 면접관을 생성할 수 있으며, 다수의 지원자를 효율적으로 관리할 수 있는 대시보드와 HR 시스템 연동(API)을 지원합니다." }
              ].map((faq, i) => (
                <div key={i} className="group p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
