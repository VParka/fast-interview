"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPARISON_DATA = [
  {
    category: "AI 기술 (Technology)",
    features: [
      { name: "AI 면접관 모델", seed: "규칙 기반 (Rule-based)", bloom: "페르소나 기반 (Advanced)", forest: "커스텀 모델 (Custom)" },
      { name: "STT 엔진 (음성인식)", seed: "Standard", bloom: "Advanced (Whisper)", forest: "Enterprise (Private)" },
      { name: "실시간 피드백", seed: false, bloom: true, forest: true },
      { name: "감정/비언어 분석", seed: false, bloom: true, forest: true },
    ]
  },
  {
    category: "코칭 및 분석 (Coaching)",
    features: [
      { name: "면접 리포트", seed: "기본 제공", bloom: "심층 분석", forest: "조직 단위 분석" },
      { name: "녹음 저장", seed: "24시간", bloom: "무제한", forest: "무제한 (자동 삭제 옵션)" },
      { name: "답변 상세 분석", seed: false, bloom: true, forest: true },
      { name: "예상 질문 생성", seed: false, bloom: true, forest: true },
    ]
  },
  {
    category: "엔터프라이즈 (Enterprise)",
    features: [
      { name: "SSO (싱글 사인온)", seed: false, bloom: false, forest: true },
      { name: "API 연동", seed: false, bloom: false, forest: true },
      { name: "전담 석세스 매니저", seed: false, bloom: false, forest: true },
      { name: "기술 지원 (SLA)", seed: "커뮤니티", bloom: "이메일", forest: "24/7 우선 지원" },
    ]
  }
];

export function ComparisonFeatureMatrix() {
  const [openCategory, setOpenCategory] = useState<string | null>("AI Technology");

  const toggleCategory = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  return (
    <section className="py-24 px-4 bg-[#0A0A0F]">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-display font-bold text-white mb-4">Compare Features</h2>
          <p className="text-slate-400">플랜별 상세 기능을 비교해보세요.</p>
        </div>

        {/* Header - Desktop Only */}
        <div className="hidden md:grid grid-cols-4 gap-4 mb-6 px-6">
          <div className="font-semibold text-white">주요 기능</div>
          <div className="text-center font-semibold text-slate-400">Seed</div>
          <div className="text-center font-semibold text-mint">Bloom</div>
          <div className="text-center font-semibold text-white">Forest</div>
        </div>

        <div className="space-y-4">
          {COMPARISON_DATA.map((category) => (
            <div key={category.category} className="border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
              >
                <span className="text-lg font-semibold text-white">{category.category}</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-slate-400 transition-transform duration-300",
                    openCategory === category.category ? "rotate-180" : ""
                  )}
                />
              </button>

              <AnimatePresence>
                {openCategory === category.category && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 space-y-4">
                      {category.features.map((feature, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 py-3 border-b border-white/5 last:border-0 items-center">
                          <div className="text-sm text-slate-300 font-medium md:col-span-1">{feature.name}</div>
                          
                          {/* Mobile Labels are tricky here, simpler to just show values centered for now */}
                          <div className="grid grid-cols-3 md:contents gap-2 text-center md:text-center mt-2 md:mt-0 col-span-1 md:col-span-3">
                            {/* Seed */}
                            <div className="text-sm text-slate-500 flex justify-center items-center">
                              <span className="md:hidden text-xs mr-2 opacity-50">Seed:</span>
                              {renderValue(feature.seed)}
                            </div>
                            {/* Bloom */}
                            <div className="text-sm text-mint font-medium flex justify-center items-center bg-mint/5 md:bg-transparent rounded py-1 md:py-0">
                              <span className="md:hidden text-xs mr-2 opacity-50">Bloom:</span>
                              {renderValue(feature.bloom)}
                            </div>
                            {/* Forest */}
                            <div className="text-sm text-white flex justify-center items-center">
                              <span className="md:hidden text-xs mr-2 opacity-50">Forest:</span>
                              {renderValue(feature.forest)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderValue(value: string | boolean) {
  if (typeof value === "boolean") {
    return value ? (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-mint/10 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-mint" strokeWidth={3} />
        </div>
      </div>
    ) : (
      <div className="flex justify-center">
        <Minus className="w-4 h-4 text-slate-600" />
      </div>
    );
  }
  return value;
}
