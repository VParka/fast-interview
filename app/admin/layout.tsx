"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkAdminAccess } from "@/lib/admin/api";
import type { AdminUser } from "@/types/admin";

/**
 * Admin 레이아웃
 * - 권한 체크 (로그인 + admin role)
 * - 사이드바 + 헤더 + 메인 콘텐츠
 * - 반응형 (모바일 메뉴 접힘)
 */

const navItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/users", label: "유저 관리", icon: Users },
  { href: "/admin/activity", label: "활동 로그", icon: ScrollText },
  { href: "/admin/payments", label: "결제 내역", icon: CreditCard },
  { href: "/admin/questions", label: "질문 관리", icon: HelpCircle },
  { href: "/admin/settings", label: "설정", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { isAuthenticated, isAdmin, user } = await checkAdminAccess();

        if (!isAuthenticated) {
          router.replace("/login?redirect=/admin");
          return;
        }

        if (!isAdmin) {
          router.replace("/admin/forbidden");
          return;
        }

        setUser(user);
      } catch (error) {
        console.error("Admin access check failed:", error);
        router.replace("/admin/forbidden");
      } finally {
        setIsLoading(false);
      }
    };

    // Skip auth check on forbidden page
    if (pathname === "/admin/forbidden") {
      setIsLoading(false);
      return;
    }

    checkAccess();
  }, [pathname, router]);

  const handleLogout = async () => {
    const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,55%,6%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-mint border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // Forbidden page doesn't need layout
  if (pathname === "/admin/forbidden") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[hsl(220,55%,6%)]">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[hsl(220,50%,8%)] border-r border-slate-700/50 
          transform transition-transform duration-300 lg:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-700/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint to-mint/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-semibold text-white">Admin Panel</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="ml-auto lg:hidden p-2 hover:bg-slate-700/50 rounded-lg"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-mint/10 text-mint border border-mint/20"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint/30 to-slate-700 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.full_name?.[0] || user?.email?.[0] || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-700/50 bg-[hsl(220,50%,8%)]">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-slate-700/50 rounded-lg"
          >
            <Menu className="w-6 h-6 text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {navItems.find((item) => item.href === pathname)?.label || "Admin"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-mint">
                서비스로 돌아가기
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
