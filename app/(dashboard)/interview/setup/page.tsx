"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Briefcase,
  Building,
  Gauge,
  ArrowRight,
  Check,
  X,
  Loader2,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { JOB_TYPES, INDUSTRIES, DIFFICULTY_LEVELS } from "@/types/interview";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface UploadedFile {
  file: File;
  docId: string | null;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface SetupState {
  jobType: string;
  industry: string;
  difficulty: "easy" | "medium" | "hard";
  resume: UploadedFile | null;
  portfolio: UploadedFile | null;
}

export default function InterviewSetupPage() {
  const router = useRouter();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserSupabaseClient();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<{ job_type?: string; industry?: string } | null>(null);

  const [setup, setSetup] = useState<SetupState>({
    jobType: "",
    industry: "",
    difficulty: "medium",
    resume: null,
    portfolio: null,
  });
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  // Check auth and load profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/interview/setup");
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("job_type, industry")
        .eq("id", user.id)
        .single();

      const profileData = profile as { job_type?: string; industry?: string } | null;

      if (profileData) {
        setUserProfile(profileData);
        // Pre-fill from profile
        setSetup(prev => ({
          ...prev,
          jobType: profileData.job_type || "",
          industry: profileData.industry || "",
        }));
      }

      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router, supabase]);

  const handleFileUpload = async (
    file: File,
    type: "resume" | "portfolio"
  ) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      setError("PDF, TXT, DOC, DOCX 파일만 업로드 가능합니다.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setError("");

    // Set uploading state
    setSetup((prev) => ({
      ...prev,
      [type]: { file, docId: null, status: "uploading" },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setSetup((prev) => ({
          ...prev,
          [type]: { file, docId: data.document.id, status: "success" },
        }));
      } else {
        setSetup((prev) => ({
          ...prev,
          [type]: { file, docId: null, status: "error", error: data.error },
        }));
        setError(data.error || "파일 업로드 실패");
      }
    } catch (err) {
      setSetup((prev) => ({
        ...prev,
        [type]: { file, docId: null, status: "error", error: "업로드 오류" },
      }));
      setError("파일 업로드 중 오류가 발생했습니다.");
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, "resume");
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, "portfolio");
  };

  const removeFile = (type: "resume" | "portfolio") => {
    setSetup((prev) => ({ ...prev, [type]: null }));
  };

  const handleStart = async () => {
    if (!setup.jobType) {
      setError("직무를 선택해주세요.");
      return;
    }

    // Check if any file is still uploading
    if (setup.resume?.status === "uploading" || setup.portfolio?.status === "uploading") {
      setError("파일 업로드가 완료될 때까지 기다려주세요.");
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: setup.jobType,
          industry: setup.industry,
          difficulty: setup.difficulty,
          resume_doc_id: setup.resume?.docId || null,
          portfolio_doc_id: setup.portfolio?.docId || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Store session data and navigate to interview
        sessionStorage.setItem("interviewSession", JSON.stringify(data.session));
        sessionStorage.setItem("firstMessage", JSON.stringify(data.first_message));
        router.push("/interview");
      } else {
        setError(data.error || "면접 시작 실패");
      }
    } catch (err) {
      setError("면접 시작 중 오류가 발생했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  const isReady = setup.jobType !== "";
  const isUploading = setup.resume?.status === "uploading" || setup.portfolio?.status === "uploading";

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mint" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">
            면접 설정
          </h1>
          <p className="text-muted-foreground">
            맞춤형 AI 면접을 위해 정보를 입력해주세요
          </p>
        </motion.div>

        {/* Setup Cards */}
        <div className="space-y-6">
          {/* Job Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-mint/20 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-mint" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">직무 선택</h2>
                  <p className="text-sm text-muted-foreground">
                    지원하는 직무를 선택하세요
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {JOB_TYPES.map((job) => (
                  <button
                    key={job.value}
                    onClick={() =>
                      setSetup((prev) => ({ ...prev, jobType: job.value }))
                    }
                    className={`p-3 rounded-xl text-sm transition-all ${
                      setup.jobType === job.value
                        ? "bg-mint text-navy font-medium"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {job.label}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Industry Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-soft-blue/20 flex items-center justify-center">
                  <Building className="w-5 h-5 text-soft-blue" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">산업 분야</h2>
                  <p className="text-sm text-muted-foreground">
                    선택사항 - 산업별 맞춤 질문 제공
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {INDUSTRIES.map((industry) => (
                  <button
                    key={industry.value}
                    onClick={() =>
                      setSetup((prev) => ({
                        ...prev,
                        industry:
                          prev.industry === industry.value ? "" : industry.value,
                      }))
                    }
                    className={`p-3 rounded-xl text-sm transition-all ${
                      setup.industry === industry.value
                        ? "bg-soft-blue text-navy font-medium"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {industry.label}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Difficulty Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">난이도</h2>
                  <p className="text-sm text-muted-foreground">
                    면접 난이도를 선택하세요
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() =>
                      setSetup((prev) => ({ ...prev, difficulty: level.value }))
                    }
                    className={`p-4 rounded-xl text-left transition-all ${
                      setup.difficulty === level.value
                        ? "bg-gradient-to-br from-mint/20 to-soft-blue/20 ring-2 ring-mint"
                        : "bg-secondary/50 hover:bg-secondary"
                    }`}
                  >
                    <p className="font-medium text-foreground">{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {level.description}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Resume Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">
                    이력서/자소서 업로드
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    선택사항 - 맞춤형 질문 생성에 활용됩니다
                  </p>
                </div>
              </div>

              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleResumeChange}
                className="hidden"
              />

              {setup.resume ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <FileText className="w-8 h-8 text-violet-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {setup.resume.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(setup.resume.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {setup.resume.status === "uploading" ? (
                    <Loader2 className="w-5 h-5 text-mint animate-spin" />
                  ) : setup.resume.status === "success" ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <button
                    onClick={() => removeFile("resume")}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => resumeInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-border rounded-xl hover:border-violet-500/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        이력서 또는 자기소개서 업로드
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, TXT, DOC, DOCX (최대 10MB)
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </Card>
          </motion.div>

          {/* Portfolio Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">
                    포트폴리오 업로드
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    선택사항 - 프로젝트 경험 기반 질문에 활용됩니다
                  </p>
                </div>
              </div>

              <input
                ref={portfolioInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handlePortfolioChange}
                className="hidden"
              />

              {setup.portfolio ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <FolderOpen className="w-8 h-8 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {setup.portfolio.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(setup.portfolio.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {setup.portfolio.status === "uploading" ? (
                    <Loader2 className="w-5 h-5 text-mint animate-spin" />
                  ) : setup.portfolio.status === "success" ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  <button
                    onClick={() => removeFile("portfolio")}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => portfolioInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-border rounded-xl hover:border-emerald-500/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        포트폴리오 또는 프로젝트 소개 업로드
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, TXT, DOC, DOCX (최대 10MB)
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </Card>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="mint"
              size="xl"
              onClick={handleStart}
              disabled={!isReady || isStarting || isUploading}
              className="w-full gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  면접 준비 중...
                </>
              ) : (
                <>
                  면접 시작하기
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
