"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Coins,
  Palette,
  Bell,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAppConfig, saveAppConfig } from "@/lib/admin/api";
import type { AppConfig } from "@/types/admin";
import { toast } from "sonner";

/**
 * 서비스 설정 페이지
 * - 크레딧 설정
 * - 플랜별 제한
 * - 테마 설정
 * - 알림 설정
 * - 기능 토글
 */

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load config from localStorage
    const loadedConfig = getAppConfig();
    setConfig(loadedConfig);
    setIsLoading(false);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      saveAppConfig(config);
      toast.success("설정이 저장되었습니다");
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("설정 저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = <K extends keyof AppConfig>(
    section: K,
    value: AppConfig[K]
  ) => {
    if (!config) return;
    setConfig({ ...config, [section]: value });
  };

  const Toggle = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? "bg-mint" : "bg-slate-600"
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 24 : 2 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
      />
    </button>
  );

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">서비스 설정</h1>
          <p className="text-slate-400">서비스 전체 설정을 관리합니다</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 bg-mint text-slate-900 hover:bg-mint/90"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          저장
        </Button>
      </div>

      {/* Credit Settings */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">크레딧 설정</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              기본 지급 크레딧
            </label>
            <Input
              type="number"
              value={config.defaultCredits}
              onChange={(e) =>
                setConfig({ ...config, defaultCredits: Number(e.target.value) })
              }
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              일일 로그인 보상
            </label>
            <Input
              type="number"
              value={config.dailyLoginReward}
              onChange={(e) =>
                setConfig({ ...config, dailyLoginReward: Number(e.target.value) })
              }
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              추천인 보상
            </label>
            <Input
              type="number"
              value={config.referralReward}
              onChange={(e) =>
                setConfig({ ...config, referralReward: Number(e.target.value) })
              }
              className="bg-slate-800/50 border-slate-700"
            />
          </div>
        </div>
      </motion.section>

      {/* Plan Limits */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <h2 className="text-lg font-semibold text-white mb-6">플랜별 제한</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50">
            <h3 className="font-medium text-white mb-4">무료 플랜</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  일일 면접 횟수
                </label>
                <Input
                  type="number"
                  value={config.freePlan.dailyInterviews}
                  onChange={(e) =>
                    updateConfig("freePlan", {
                      ...config.freePlan,
                      dailyInterviews: Number(e.target.value),
                    })
                  }
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  세션당 질문 수
                </label>
                <Input
                  type="number"
                  value={config.freePlan.questionsPerSession}
                  onChange={(e) =>
                    updateConfig("freePlan", {
                      ...config.freePlan,
                      questionsPerSession: Number(e.target.value),
                    })
                  }
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Paid Plan */}
          <div className="p-4 rounded-lg bg-mint/5 border border-mint/20">
            <h3 className="font-medium text-mint mb-4">유료 플랜</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  일일 면접 횟수 (-1 = 무제한)
                </label>
                <Input
                  type="number"
                  value={config.paidPlan.dailyInterviews}
                  onChange={(e) =>
                    updateConfig("paidPlan", {
                      ...config.paidPlan,
                      dailyInterviews: Number(e.target.value),
                    })
                  }
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  세션당 질문 수
                </label>
                <Input
                  type="number"
                  value={config.paidPlan.questionsPerSession}
                  onChange={(e) =>
                    updateConfig("paidPlan", {
                      ...config.paidPlan,
                      questionsPerSession: Number(e.target.value),
                    })
                  }
                  className="bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Theme Settings */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Palette className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">테마 설정</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">다크 모드</p>
            <p className="text-xs text-slate-400">서비스 전체에 다크 모드 적용</p>
          </div>
          <Toggle
            enabled={config.theme.darkMode}
            onChange={(value) =>
              updateConfig("theme", { ...config.theme, darkMode: value })
            }
          />
        </div>
      </motion.section>

      {/* Notification Settings */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Bell className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">알림 설정</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">이메일 알림</p>
              <p className="text-xs text-slate-400">중요 이벤트 시 이메일 알림</p>
            </div>
            <Toggle
              enabled={config.notifications.emailEnabled}
              onChange={(value) =>
                updateConfig("notifications", {
                  ...config.notifications,
                  emailEnabled: value,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">웹훅 알림</p>
              <p className="text-xs text-slate-400">Slack/Discord 연동</p>
            </div>
            <Toggle
              enabled={config.notifications.webhookEnabled}
              onChange={(value) =>
                updateConfig("notifications", {
                  ...config.notifications,
                  webhookEnabled: value,
                })
              }
            />
          </div>
        </div>
      </motion.section>

      {/* Feature Toggles */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <h2 className="text-lg font-semibold text-white mb-6">기능 토글</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">회원가입 허용</p>
              <p className="text-xs text-slate-400">새로운 회원가입 활성화</p>
            </div>
            <Toggle
              enabled={config.features.registrationEnabled}
              onChange={(value) =>
                updateConfig("features", {
                  ...config.features,
                  registrationEnabled: value,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">프리미엄 기능</p>
              <p className="text-xs text-slate-400">유료 기능 활성화</p>
            </div>
            <Toggle
              enabled={config.features.premiumEnabled}
              onChange={(value) =>
                updateConfig("features", {
                  ...config.features,
                  premiumEnabled: value,
                })
              }
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <div>
              <p className="text-sm font-medium text-red-400">점검 모드</p>
              <p className="text-xs text-slate-400">서비스 점검 시 활성화</p>
            </div>
            <Toggle
              enabled={config.features.maintenanceMode}
              onChange={(value) =>
                updateConfig("features", {
                  ...config.features,
                  maintenanceMode: value,
                })
              }
            />
          </div>
        </div>
      </motion.section>
    </div>
  );
}
