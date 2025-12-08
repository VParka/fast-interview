"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, Check } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createBrowserSupabaseClient();

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && confirmPassword !== "";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!isPasswordValid) {
      setError("비밀번호 조건을 모두 충족해주세요.");
      setIsLoading(false);
      return;
    }

    if (!doPasswordsMatch) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("이미 가입된 이메일입니다.");
        } else {
          setError(error.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: "google" | "github" | "kakao") => {
    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError("소셜 회원가입 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <div className="glass-card rounded-3xl p-8 lg:p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-mint" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              이메일을 확인해주세요
            </h1>
            <p className="text-muted-foreground mb-8">
              <span className="text-foreground font-medium">{email}</span>으로<br />
              인증 메일을 발송했습니다.<br />
              이메일의 링크를 클릭하여 회원가입을 완료해주세요.
            </p>
            <div className="space-y-4">
              <Button
                variant="mint"
                className="w-full h-12"
                onClick={() => router.push("/login")}
              >
                로그인 페이지로 이동
              </Button>
              <p className="text-sm text-muted-foreground">
                이메일이 오지 않았나요?{" "}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-mint hover:underline"
                >
                  다시 시도
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden py-12">
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
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-card rounded-3xl p-8 lg:p-10">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint to-soft-blue flex items-center justify-center shadow-mint">
              <span className="font-display font-bold text-navy text-xl">IM</span>
            </div>
            <span className="font-display font-semibold text-2xl text-foreground">
              IMSAM
            </span>
          </Link>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">회원가입</h1>
            <p className="text-muted-foreground">AI 면접 서비스를 시작하세요</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Kakao */}
            <Button
              variant="outline"
              className="h-12 bg-[#FEE500] hover:bg-[#FDD800] text-[#000000] border-none"
              onClick={() => handleOAuthSignup("kakao")}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.68 1.738 5.028 4.355 6.371-.146.534-.94 3.437-.972 3.671 0 0-.02.166.088.229.108.063.235.014.235.014.31-.043 3.592-2.349 4.159-2.748.694.1 1.415.153 2.135.153 5.523 0 10-3.463 10-7.69C22 6.463 17.523 3 12 3z"/>
              </svg>
              카카오
            </Button>

            {/* Google */}
            <Button
              variant="outline"
              className="h-12"
              onClick={() => handleOAuthSignup("google")}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-sm text-muted-foreground">
                또는 이메일로 가입
              </span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                이름
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="h-12 pl-12 bg-secondary/30 border-border/50 focus:border-mint"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                이메일
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-12 pl-12 bg-secondary/30 border-border/50 focus:border-mint"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                비밀번호
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-12 pr-12 bg-secondary/30 border-border/50 focus:border-mint"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Requirements */}
              {password && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className={`flex items-center gap-2 text-xs ${passwordChecks.length ? "text-mint" : "text-muted-foreground"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.length ? "bg-mint" : "bg-secondary"}`}>
                      {passwordChecks.length && <Check className="w-3 h-3 text-navy" />}
                    </div>
                    8자 이상
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordChecks.uppercase ? "text-mint" : "text-muted-foreground"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.uppercase ? "bg-mint" : "bg-secondary"}`}>
                      {passwordChecks.uppercase && <Check className="w-3 h-3 text-navy" />}
                    </div>
                    대문자 포함
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordChecks.lowercase ? "text-mint" : "text-muted-foreground"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.lowercase ? "bg-mint" : "bg-secondary"}`}>
                      {passwordChecks.lowercase && <Check className="w-3 h-3 text-navy" />}
                    </div>
                    소문자 포함
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordChecks.number ? "text-mint" : "text-muted-foreground"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.number ? "bg-mint" : "bg-secondary"}`}>
                      {passwordChecks.number && <Check className="w-3 h-3 text-navy" />}
                    </div>
                    숫자 포함
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                비밀번호 확인
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-12 pl-12 pr-12 bg-secondary/30 border-border/50 focus:border-mint ${
                    confirmPassword && !doPasswordsMatch ? "border-destructive" : ""
                  }`}
                  required
                  disabled={isLoading}
                />
                {confirmPassword && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {doPasswordsMatch ? (
                      <Check className="w-5 h-5 text-mint" />
                    ) : (
                      <span className="text-destructive text-xs">불일치</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="mint"
              className="w-full h-12 text-base"
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  회원가입
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-mint hover:underline font-medium">
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-mint transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
