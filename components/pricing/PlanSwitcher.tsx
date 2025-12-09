"use client";

import { motion } from "framer-motion";

interface PlanSwitcherProps {
  isAnnual: boolean;
  onToggle: (checked: boolean) => void;
}

export function PlanSwitcher({ isAnnual, onToggle }: PlanSwitcherProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 mb-16">
      <div className="relative p-1 bg-white/5 rounded-full border border-white/10 flex items-center">
        {/* Sliding Pill */}
        <motion.div
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-[#0A0A0F] rounded-full border border-white/10 shadow-lg"
          animate={{
            x: isAnnual ? "100%" : "0%",
            left: isAnnual ? "0" : "4px" // adjust for padding
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
          style={{ width: "calc(50% - 4px)" }}
        />

        {/* Monthly Button */}
        <button
          onClick={() => onToggle(false)}
          className={`relative z-10 px-6 py-2.5 text-sm font-medium transition-colors duration-200 ${
            !isAnnual ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          월간 결제
        </button>

        {/* Annual Button */}
        <button
          onClick={() => onToggle(true)}
          className={`relative z-10 px-6 py-2.5 text-sm font-medium transition-colors duration-200 ${
            isAnnual ? "text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          연간 결제
        </button>
      </div>

      {/* Discount Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2"
      >
        <span className="text-sm text-slate-400">최대 20% 할인</span>
        <motion.div
          animate={isAnnual ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="px-2 py-0.5 rounded-full bg-mint/10 border border-mint/20 text-[10px] font-bold text-mint uppercase tracking-wider"
        >
          SAVE 20%
        </motion.div>
      </motion.div>
    </div>
  );
}
