"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { User, Briefcase, Building2, ArrowRight, Loader2 } from "lucide-react";

const JOB_TYPES = [
  { value: "frontend", label: "프론트엔드 개발자" },
  { value: "backend", label: "백엔드 개발자" },
  { value: "fullstack", label: "풀스택 개발자" },
  { value: "mobile", label: "모바일 개발자" },
  { value: "devops", label: "DevOps 엔지니어" },
  { value: "data_engineer", label: "데이터 엔지니어" },
  { value: "ml_engineer", label: "ML 엔지니어" },
  { value: "data_scientist", label: "데이터 사이언티스트" },
  { value: "security", label: "보안 엔지니어" },
  { value: "qa", label: "QA 엔지니어" },
  { value: "pm", label: "프로덕트 매니저" },
  { value: "ux_designer", label: "UX 디자이너" },
  { value: "ui_designer", label: "UI 디자이너" },
  { value: "service_planner", label: "서비스 기획자" },
  { value: "growth_marketer", label: "그로스 마케터" },
  { value: "other", label: "기타" },
];

const INDUSTRIES = [
  { value: "tech", label: "IT/테크" },
  { value: "finance", label: "금융/핀테크" },
  { value: "ecommerce", label: "이커머스" },
  { value: "healthcare", label: "헬스케어/바이오" },
  { value: "education", label: "에듀테크" },
  { value: "game", label: "게임" },
  { value: "media", label: "미디어/엔터" },
  { value: "logistics", label: "물류/유통" },
  { value: "mobility", label: "모빌리티" },
  { value: "startup", label: "스타트업" },
  { value: "enterprise", label: "대기업" },
  { value: "consulting", label: "컨설팅" },
  { value: "agency", label: "에이전시" },
  { value: "other", label: "기타" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    job_type: "",
    industry: "",
  });

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser({ id: user.id, email: user.email || "" });

      // Check if profile already has job_type (already onboarded)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, job_type, industry")
        .eq("id", user.id)
        .single();

      const profileData = profile as { full_name?: string; job_type?: string; industry?: string } | null;

      if (profileData?.job_type) {
        // Already completed onboarding
        router.push("/dashboard");
        return;
      }

      // Pre-fill name if available
      if (profileData?.full_name || user.user_metadata?.full_name) {
        setFormData(prev => ({
          ...prev,
          full_name: profileData?.full_name || user.user_metadata?.full_name || "",
        }));
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.job_type || !formData.industry) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (!user) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          job_type: formData.job_type,
          industry: formData.industry,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Profile update error:", data.error);
        alert("프로필 저장 중 오류가 발생했습니다.");
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mint" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 bg-gradient-to-br from-mint to-soft-blue rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <User className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              프로필 설정
            </h1>
            <p className="text-muted-foreground text-sm">
              맞춤형 면접 연습을 위해 기본 정보를 입력해주세요
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                이름
              </Label>
              <Input
                id="full_name"
                type="text"
                placeholder="홍길동"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="h-12"
                required
              />
            </div>

            {/* Job Type */}
            <div className="space-y-2">
              <Label htmlFor="job_type" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                희망 직무
              </Label>
              <Select
                value={formData.job_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, job_type: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="직무를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((job) => (
                    <SelectItem key={job.value} value={job.value}>
                      {job.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                관심 산업
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(value) =>
                  setFormData({ ...formData, industry: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="산업을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-mint to-soft-blue hover:opacity-90 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  시작하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Skip Option */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              나중에 설정하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
