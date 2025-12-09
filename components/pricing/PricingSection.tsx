"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PricingCard } from "@/components/pricing/PricingCard";
import { PlanSwitcher } from "@/components/pricing/PlanSwitcher";
import { PLANS } from "@/lib/constants/pricing";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section className="relative w-full py-24 lg:py-32 px-4 bg-[#0A0A0F] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-float opacity-30" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-mint/5 rounded-full blur-[100px] animate-float opacity-20" style={{ animationDelay: "2s" }} />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold text-white mb-6 text-balance"
          >
            당신의 <span className="text-gradient-mint">커리어 성장</span>을 위한<br />
            최적의 플랜을 선택하세요.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-400"
          >
            AI 면접관과의 무제한 대화, 그리고 실시간 분석.<br className="hidden sm:block" />
            당신의 커리어 여정에 맞는 플랜을 선택하세요.
          </motion.p>
        </div>

        <PlanSwitcher isAnnual={isAnnual} onToggle={setIsAnnual} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PLANS.map((plan: typeof PLANS[0], index: number) => (
            <PricingCard
              key={plan.id}
              index={index}
              title={plan.name}
              description={plan.description}
              price={isAnnual ? plan.price.annual : plan.price.monthly}
              period={plan.price.monthly === "무료" || plan.price.monthly === "문의" ? "" : (isAnnual ? "/년" : "/월")}
              features={plan.features}
              isPopular={plan.isPopular}
              buttonText={plan.buttonText}
              onButtonClick={() => console.log(`Selected ${plan.name}`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
