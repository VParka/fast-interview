"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
  index?: number;
}

export function PricingCard({
  title,
  price,
  period = "/mo",
  description,
  features,
  isPopular = false,
  buttonText = "Start Now",
  onButtonClick,
  index = 0,
}: PricingCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        "group relative rounded-[24px] border border-white/5 bg-[#0A0A0F] p-8 h-full",
        "hover:border-white/10 transition-colors duration-500",
        isPopular ? "scale-105 z-10 shadow-2xl shadow-mint/10" : "scale-100 z-0"
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight Effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[24px] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(94, 234, 212, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-mint blur-md opacity-50" />
            <div className="relative px-4 py-1.5 rounded-full bg-[#0A0A0F] border border-mint/50 flex items-center justify-center">
              <span className="text-xs font-bold text-mint tracking-wider uppercase">
                추천 (Best)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="mb-8">
          <h3 className="text-xl font-display font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed min-h-[40px]">
            {description}
          </p>
        </div>

        {/* Price */}
        <div className="mb-8 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white tracking-tight">{price}</span>
          {price !== "Free" && (
            <span className="text-sm text-slate-500 font-medium">{period}</span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Features */}
        <ul className="space-y-4 mb-8 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-mint/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-mint" strokeWidth={3} />
              </div>
              <span className="text-sm text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <Button
          onClick={onButtonClick}
          className={cn(
            "w-full h-14 rounded-xl font-medium transition-all duration-300",
            isPopular
              ? "bg-gradient-to-r from-mint to-soft-blue text-navy hover:shadow-lg hover:shadow-mint/25 hover:scale-[1.02]"
              : "bg-white/5 text-white border border-white/5 hover:bg-white/10 hover:border-white/10"
          )}
        >
          {buttonText}
        </Button>
      </div>
    </motion.div>
  );
}
