"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(errorParam === "auth_callback_error" ? "인증 중 오류가 발생했습니다. 다시 시도해주세요." : "");

  const supabase = createBrowserSupabaseClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setError(error.message);
        }
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "kakao") => {
    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError("소셜 로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  // Naver OAuth (custom implementation via Supabase Edge Function or direct)
  const handleNaverLogin = async () => {
    setIsLoading(true);
    setError("");

    // Naver OAuth requires custom setup
    // For now, we'll use a placeholder that redirects to Naver OAuth
    const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    const REDIRECT_URI = `${window.location.origin}/auth/callback/naver`;
    const STATE = Math.random().toString(36).substring(7);

    if (!NAVER_CLIENT_ID) {
      setError("네이버 로그인이 설정되지 않았습니다.");
      setIsLoading(false);
      return;
    }

    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;
    window.location.href = naverAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-mint/20 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-soft-blue/20 blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4 sm:mx-auto"
      >
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 touch-target">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-mint to-soft-blue flex items-center justify-center shadow-mint">
              <span className="font-display font-bold text-navy text-lg sm:text-xl">IM</span>
            </div>
            <span className="font-display font-semibold text-xl sm:text-2xl text-foreground">
              IMSAM
            </span>
          </Link>

          {/* Title */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">로그인</h1>
            <p className="text-sm sm:text-base text-muted-foreground">AI 면접 서비스에 오신 것을 환영합니다</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base text-foreground">
                이메일
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  variant="filled"
                  inputSize="lg"
                  className="pl-10 sm:pl-12"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base text-foreground">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  variant="filled"
                  inputSize="lg"
                  className="pl-10 sm:pl-12 pr-12"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground touch-target"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs sm:text-sm text-mint hover:underline touch-target">
                비밀번호를 잊으셨나요?
              </Link>
            </div>

            <Button type="submit" variant="mint" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  로그인
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6 sm:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground">
                소셜 계정으로 로그인
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-2 sm:space-y-3">
            {/* Kakao */}
            <Button
              variant="outline"
              size="lg"
              className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#000000] border-none"
              onClick={() => handleOAuthLogin("kakao")}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.68 1.738 5.028 4.355 6.371-.146.534-.94 3.437-.972 3.671 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.592-2.349 4.159-2.748.694.1 1.415.153 2.135.153 5.523 0 10-3.463 10-7.69C22 6.463 17.523 3 12 3z"/>
              </svg>
              <span className="text-sm sm:text-base">카카오로 로그인</span>
            </Button>

            {/* Naver */}
            <Button
              variant="outline"
              size="lg"
              className="w-full bg-[#03C75A] hover:bg-[#02B350] text-white border-none"
              onClick={handleNaverLogin}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              <span className="text-sm sm:text-base">네이버로 로그인</span>
            </Button>

            {/* Google */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => handleOAuthLogin("google")}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm sm:text-base">Google로 로그인</span>
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-6 sm:mt-8">
            <p className="text-muted-foreground text-xs sm:text-sm">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-mint hover:underline font-medium touch-target">
                회원가입
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4 sm:mt-6">
          <Link href="/" className="text-xs sm:text-sm text-muted-foreground hover:text-mint transition-colors touch-target inline-block">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
