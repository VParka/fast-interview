"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Settings,
  User,
  Bell,
  Mic,
  Volume2,
  Clock,
  Target,
  Trash2,
  Loader2,
  Save,
  ChevronRight,
  Shield,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UserSettings {
  // Interview Settings
  default_difficulty: "easy" | "medium" | "hard";
  auto_submit_on_timeout: boolean;
  // Audio Settings
  enable_tts: boolean;
  tts_speed: number;
  enable_stt: boolean;
  // Notification Settings
  enable_notifications: boolean;
  enable_email_summary: boolean;
  // Privacy Settings
  store_transcripts: boolean;
  share_anonymous_data: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  target_job?: string;
  target_industry?: string;
  created_at: string;
}

const defaultSettings: UserSettings = {
  default_difficulty: "medium",
  auto_submit_on_timeout: true,
  enable_tts: true,
  tts_speed: 1.0,
  enable_stt: true,
  enable_notifications: true,
  enable_email_summary: false,
  store_transcripts: true,
  share_anonymous_data: false,
};

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        const profile = profileData as {
          id: string;
          full_name?: string;
          target_job?: string;
          target_industry?: string;
          created_at: string;
          settings?: UserSettings;
        };

        setProfile({
          id: user.id,
          email: user.email || "",
          full_name: profile.full_name || "",
          target_job: profile.target_job,
          target_industry: profile.target_industry,
          created_at: profile.created_at,
        });

        // Load settings from profile if exists
        if (profile.settings) {
          setSettings({ ...defaultSettings, ...profile.settings });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ settings })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("설정이 저장되었습니다");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("설정 저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!profile) return;

    try {
      // Delete all interview results
      await supabase
        .from("interview_results")
        .delete()
        .eq("user_id", profile.id);

      // Delete all messages
      await supabase
        .from("messages")
        .delete()
        .eq("session_id", profile.id);

      // Delete all interview sessions
      await supabase
        .from("interview_sessions")
        .delete()
        .eq("user_id", profile.id);

      toast.success("모든 면접 데이터가 삭제되었습니다");
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("데이터 삭제에 실패했습니다");
    }
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-mint" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            설정
          </h1>
          <p className="text-muted-foreground">
            면접 환경과 계정 설정을 관리하세요
          </p>
        </div>
        <Button
          variant="mint"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          저장
        </Button>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center">
                <User className="w-5 h-5 text-mint" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  프로필
                </h2>
                <p className="text-sm text-muted-foreground">
                  계정 정보를 확인하세요
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">이메일</span>
                <span className="text-sm font-medium text-foreground">
                  {profile?.email}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <span className="text-sm text-muted-foreground">이름</span>
                <span className="text-sm font-medium text-foreground">
                  {profile?.full_name || "미설정"}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-muted-foreground">가입일</span>
                <span className="text-sm font-medium text-foreground">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("ko-KR")
                    : "-"}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Interview Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-soft-blue/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-soft-blue" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  면접 설정
                </h2>
                <p className="text-sm text-muted-foreground">
                  기본 면접 환경을 설정하세요
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Default Difficulty */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">기본 난이도</Label>
                <div className="flex gap-2">
                  {[
                    { value: "easy", label: "초급" },
                    { value: "medium", label: "중급" },
                    { value: "hard", label: "고급" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updateSetting(
                          "default_difficulty",
                          option.value as UserSettings["default_difficulty"]
                        )
                      }
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        settings.default_difficulty === option.value
                          ? "bg-mint text-navy"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed Time Limit Info */}
              <div className="flex items-center justify-between py-3 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      면접 시간 제한
                    </p>
                    <p className="text-xs text-muted-foreground">
                      모든 면접은 5분으로 고정됩니다
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-mint/10 text-mint text-sm font-medium">
                  5분 고정
                </span>
              </div>

              {/* Auto Submit */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      시간 초과 시 자동 종료
                    </p>
                    <p className="text-xs text-muted-foreground">
                      5분이 지나면 면접이 자동으로 종료됩니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.auto_submit_on_timeout}
                  onCheckedChange={(checked) =>
                    updateSetting("auto_submit_on_timeout", checked)
                  }
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Audio Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-mint" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  음성 설정
                </h2>
                <p className="text-sm text-muted-foreground">
                  음성 인식 및 합성 설정을 관리하세요
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* TTS */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      면접관 음성 출력 (TTS)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      면접관의 질문을 음성으로 들을 수 있습니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_tts}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_tts", checked)
                  }
                />
              </div>

              {/* STT */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      음성 인식 (STT)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      마이크로 답변을 입력할 수 있습니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_stt}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_stt", checked)
                  }
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-soft-blue/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-soft-blue" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  알림 설정
                </h2>
                <p className="text-sm text-muted-foreground">
                  알림 수신 여부를 설정하세요
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      브라우저 알림
                    </p>
                    <p className="text-xs text-muted-foreground">
                      면접 완료, 리포트 생성 시 알림을 받습니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_notifications", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      이메일 요약 리포트
                    </p>
                    <p className="text-xs text-muted-foreground">
                      주간 면접 요약을 이메일로 받습니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_email_summary}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_email_summary", checked)
                  }
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Privacy & Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  개인정보 및 데이터
                </h2>
                <p className="text-sm text-muted-foreground">
                  데이터 저장 및 공유 설정을 관리하세요
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      면접 기록 저장
                    </p>
                    <p className="text-xs text-muted-foreground">
                      면접 대화 내용을 저장하여 나중에 확인할 수 있습니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.store_transcripts}
                  onCheckedChange={(checked) =>
                    updateSetting("store_transcripts", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      익명 데이터 공유
                    </p>
                    <p className="text-xs text-muted-foreground">
                      서비스 개선을 위해 익명화된 데이터를 공유합니다
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.share_anonymous_data}
                  onCheckedChange={(checked) =>
                    updateSetting("share_anonymous_data", checked)
                  }
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="p-6 border-destructive/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  위험 구역
                </h2>
                <p className="text-sm text-muted-foreground">
                  되돌릴 수 없는 작업입니다
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                모든 면접 데이터 삭제
              </Button>
            ) : (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-foreground mb-4">
                  정말로 모든 면접 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수
                  없습니다.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    취소
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAllData}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제 확인
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
