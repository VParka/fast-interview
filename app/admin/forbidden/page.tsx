"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Admin 권한 없음 (403 Forbidden) 페이지
 */
export default function AdminForbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(220,55%,6%)] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">접근 권한 없음</h1>
        <p className="text-slate-400 mb-8">
          이 페이지에 접근하려면 관리자 권한이 필요합니다.
          <br />
          관리자 권한이 필요하시면 시스템 관리자에게 문의하세요.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="gap-2 bg-mint text-slate-900 hover:bg-mint/90">
              <Home className="w-4 h-4" />
              대시보드로 이동
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2 border-slate-600">
              <ArrowLeft className="w-4 h-4" />
              홈으로 돌아가기
            </Button>
          </Link>
        </div>

        {/* Error Code */}
        <p className="text-xs text-slate-600 mt-8">Error Code: 403 Forbidden</p>
      </motion.div>
    </div>
  );
}
