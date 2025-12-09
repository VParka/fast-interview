"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "서비스 소개", href: "#product" },
  { label: "AI면접", href: "#interviewers" },
  { label: "분석", href: "#analytics" },
  { label: "보안", href: "#security" },
  { label: "사례", href: "#case-study" },
];

export function Navigation() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          email: user.email || "",
          name: user.user_metadata?.full_name || user.email?.split("@")[0],
        });
      } else {
        setUser(null);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || "",
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0],
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Call logout API
      await fetch("/api/auth/logout", { method: "POST" });

      // Also sign out on client side
      await supabase.auth.signOut();

      // Clear user state
      setUser(null);

      // Redirect to home
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "glass-card py-3"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <motion.a
            href="#"
            className="flex items-center gap-2 sm:gap-3 group touch-target"
            whileHover={{ scale: 1.02 }}
          >
            <Image
              src="/app-icon-dark.png"
              alt="IMSAM"
              width={30}
              height={30}
              className="w-8 h-8 object-contain"
            />
            <span className="font-display font-semibold text-lg sm:text-xl text-foreground">
              IMSAM
            </span>
          </motion.a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    대시보드
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      {user.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        대시보드
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/onboarding" className="cursor-pointer">
                        프로필 설정
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="text-red-500 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    로그인
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="mint" size="sm">
                    시작하기
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors touch-target"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-x-0 top-16 sm:top-20 z-40 lg:hidden safe-top"
            >
              <div className="mx-3 sm:mx-4 glass-card rounded-2xl p-4 sm:p-6 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin">
                <nav className="flex flex-col gap-1 sm:gap-2">
                  {navItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 text-base font-medium text-foreground hover:bg-secondary/50 rounded-lg transition-colors touch-target"
                    >
                      {item.label}
                    </a>
                  ))}
                  <div className="border-t border-border my-2" />
                  {user ? (
                    <>
                      <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" size="lg" className="w-full mb-2">
                          대시보드
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="w-full"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleLogout();
                        }}
                        disabled={isLoggingOut}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="outline" size="lg" className="w-full mb-2">
                          로그인
                        </Button>
                      </Link>
                      <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="mint" size="lg" className="w-full">
                          시작하기
                        </Button>
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
