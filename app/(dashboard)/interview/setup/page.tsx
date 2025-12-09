"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from "lucide-react";
import { DIFFICULTY_LEVELS } from "@/types/interview";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface JobCategory {
  id: string;
  code: string;
  name_ko: string;
  icon: string;
  sort_order: number;
}

interface Industry {
  id: string;
  code: string;
  name_ko: string;
  icon: string;
  sort_order: number;
}

// 한 줄에 표시할 아이템 수 (반응형)
const ITEMS_PER_ROW_JOB = { mobile: 2, desktop: 3 };
const ITEMS_PER_ROW_INDUSTRY = { mobile: 2, desktop: 4 };
const VISIBLE_ROWS = 2;

interface UploadedFile {
  file: File;
  docId: string | null;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface SetupState {
  jdText: string;
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

  // DB에서 가져온 데이터
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 더보기 토글 상태
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showAllIndustries, setShowAllIndustries] = useState(false);

  const [setup, setSetup] = useState<SetupState>({
    jdText: "",
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

  // DB에서 직무/산업 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [jobRes, industryRes] = await Promise.all([
          supabase
            .from("job_categories")
            .select("id, code, name_ko, icon, sort_order")
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("industries")
            .select("id, code, name_ko, icon, sort_order")
            .eq("is_active", true)
            .order("sort_order"),
        ]);

        if (jobRes.data) {
          setJobCategories(jobRes.data);
        }
        if (industryRes.data) {
          setIndustries(industryRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [supabase]);

  // 표시할 직무 아이템 계산
  const visibleJobs = useMemo(() => {
    if (showAllJobs) return jobCategories;
    // 데스크탑 기준 2줄
    const limit = ITEMS_PER_ROW_JOB.desktop * VISIBLE_ROWS;
    return jobCategories.slice(0, limit);
  }, [jobCategories, showAllJobs]);

  // 표시할 산업 아이템 계산
  const visibleIndustries = useMemo(() => {
    if (showAllIndustries) return industries;
    // 데스크탑 기준 2줄
    const limit = ITEMS_PER_ROW_INDUSTRY.desktop * VISIBLE_ROWS;
    return industries.slice(0, limit);
  }, [industries, showAllIndustries]);

  // 더보기 버튼 표시 여부
  const showJobsMoreButton = jobCategories.length > ITEMS_PER_ROW_JOB.desktop * VISIBLE_ROWS;
  const showIndustriesMoreButton = industries.length > ITEMS_PER_ROW_INDUSTRY.desktop * VISIBLE_ROWS;

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
          jd_text: setup.jdText || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Store session data and navigate to interview
        sessionStorage.setItem("interviewSession", JSON.stringify(data.session));
        sessionStorage.setItem("firstMessage", JSON.stringify(data.first_message));
        // Store interviewer names (random per session from DB)
        if (data.interviewer_names) {
          sessionStorage.setItem("interviewerNames", JSON.stringify(data.interviewer_names));
        }
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
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4 safe-bottom">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
            면접 설정
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground px-4">
            맞춤형 AI 면접을 위해 정보를 입력해주세요
          </p>
        </motion.div>

        {/* Setup Cards */}
        <div className="space-y-4 sm:space-y-6">
          {/* JD (Job Description) Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-sm sm:text-base text-foreground">채용공고 (JD)</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    선택사항 - 채용공고의 자격요건/우대사항을 붙여넣으세요
                  </p>
                </div>
              </div>
              <textarea
                value={setup.jdText}
                onChange={(e) => setSetup((prev) => ({ ...prev, jdText: e.target.value }))}
                placeholder={`채용공고에서 자격요건, 우대사항, 주요업무 등을 복사해서 붙여넣으세요.\n\n예시:\n• React, TypeScript 경험 3년 이상\n• RESTful API 설계 경험\n• 애자일 환경에서의 협업 경험`}
                className="w-full h-32 sm:h-40 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
              {setup.jdText && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {setup.jdText.length}자 입력됨
                </p>
              )}
            </Card>
          </motion.div>

          {/* Job Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-mint/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-mint" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-sm sm:text-base text-foreground">직무 선택</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    지원하는 직무를 선택하세요
                  </p>
                </div>
              </div>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-mint" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    <AnimatePresence mode="popLayout">
                      {visibleJobs.map((job) => (
                        <motion.button
                          key={job.code}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() =>
                            setSetup((prev) => ({ ...prev, jobType: job.code }))
                          }
                          className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all touch-target ${
                            setup.jobType === job.code
                              ? "bg-mint text-navy font-medium"
                              : "bg-secondary/50 text-foreground hover:bg-secondary active:scale-95"
                          }`}
                        >
                          <span className="mr-1">{job.icon}</span>
                          {job.name_ko}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                  {showJobsMoreButton && (
                    <button
                      onClick={() => setShowAllJobs(!showAllJobs)}
                      className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAllJobs ? (
                        <>
                          접기 <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          더보기 ({jobCategories.length - visibleJobs.length}개) <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </Card>
          </motion.div>

          {/* Industry Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-soft-blue/20 flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 text-soft-blue" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-sm sm:text-base text-foreground">산업 분야</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    선택사항 - 산업별 맞춤 질문 제공
                  </p>
                </div>
              </div>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-soft-blue" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    <AnimatePresence mode="popLayout">
                      {visibleIndustries.map((industry) => (
                        <motion.button
                          key={industry.code}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() =>
                            setSetup((prev) => ({
                              ...prev,
                              industry:
                                prev.industry === industry.code ? "" : industry.code,
                            }))
                          }
                          className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all touch-target ${
                            setup.industry === industry.code
                              ? "bg-soft-blue text-navy font-medium"
                              : "bg-secondary/50 text-foreground hover:bg-secondary active:scale-95"
                          }`}
                        >
                          <span className="mr-1">{industry.icon}</span>
                          {industry.name_ko}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                  {showIndustriesMoreButton && (
                    <button
                      onClick={() => setShowAllIndustries(!showAllIndustries)}
                      className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAllIndustries ? (
                        <>
                          접기 <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          더보기 ({industries.length - visibleIndustries.length}개) <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </Card>
          </motion.div>

          {/* Difficulty Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-sm sm:text-base text-foreground">난이도</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
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
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-sm sm:text-base text-foreground">
                    이력서/자소서 업로드
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
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
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-sm sm:text-base text-foreground">
                    포트폴리오 업로드
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
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
