"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import { JOB_TYPES, INDUSTRIES, DIFFICULTY_LEVELS } from "@/types/interview";

interface SetupState {
  jobType: string;
  industry: string;
  difficulty: "easy" | "medium" | "hard";
  resumeFile: File | null;
  resumeDocId: string | null;
}

export default function InterviewSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [setup, setSetup] = useState<SetupState>({
    jobType: "",
    industry: "",
    difficulty: "medium",
    resumeFile: null,
    resumeDocId: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "text/plain", "application/msword"];
    if (!validTypes.includes(file.type)) {
      setError("PDF, TXT, DOC 파일만 업로드 가능합니다.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setSetup((prev) => ({ ...prev, resumeFile: file }));
    setError("");

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "resume");

      const response = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setSetup((prev) => ({ ...prev, resumeDocId: data.document.id }));
      } else {
        setError(data.error || "파일 업로드 실패");
        setSetup((prev) => ({ ...prev, resumeFile: null }));
      }
    } catch (err) {
      setError("파일 업로드 중 오류가 발생했습니다.");
      setSetup((prev) => ({ ...prev, resumeFile: null }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleStart = async () => {
    if (!setup.jobType) {
      setError("직무를 선택해주세요.");
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
          resume_doc_id: setup.resumeDocId,
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
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {setup.resumeFile ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                  <FileText className="w-8 h-8 text-mint" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {setup.resumeFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(setup.resumeFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-mint animate-spin" />
                  ) : setup.resumeDocId ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                  <button
                    onClick={() =>
                      setSetup((prev) => ({
                        ...prev,
                        resumeFile: null,
                        resumeDocId: null,
                      }))
                    }
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-border rounded-xl hover:border-mint/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        파일을 드래그하거나 클릭하여 업로드
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, TXT, DOC (최대 5MB)
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
            transition={{ delay: 0.5 }}
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
