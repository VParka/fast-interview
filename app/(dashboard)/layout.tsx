"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Mic,
  BarChart3,
  Settings,
  LogOut,
  User,
  Loader2,
  History,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
  { icon: Mic, label: "면접 시작", href: "/interview" },
  { icon: History, label: "면접 기록", href: "/dashboard/history" },
  { icon: BarChart3, label: "분석 리포트", href: "/dashboard/reports" },
  { icon: Settings, label: "설정", href: "/dashboard/settings" },
];

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get singleton Supabase client
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('Auth error in layout:', authError);
          return;
        }

        if (authUser && isMounted) {
          // Get profile data with timeout
          const profilePromise = supabase
            .from("profiles")
            .select("full_name")
            .eq("id", authUser.id)
            .single();

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
          });

          try {
            const { data: profile } = await Promise.race([profilePromise, timeoutPromise]) as { data: { full_name?: string } | null };

            if (isMounted) {
              setUser({
                id: authUser.id,
                email: authUser.email || "",
                full_name: profile?.full_name || authUser.user_metadata?.full_name,
              });
            }
          } catch (profileError) {
            console.error('Profile fetch error:', profileError);
            // Still set user with basic info even if profile fetch fails
            if (isMounted) {
              setUser({
                id: authUser.id,
                email: authUser.email || "",
                full_name: authUser.user_metadata?.full_name,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          window.location.href = "/login";
        } else if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", session.user.id)
              .single() as { data: { full_name?: string } | null };

            if (isMounted) {
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                full_name: profile?.full_name || session.user.user_metadata?.full_name,
              });
            }
          } catch (error) {
            console.error('Profile fetch error on auth change:', error);
            if (isMounted) {
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                full_name: session.user.user_metadata?.full_name,
              });
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear all storage
      sessionStorage.clear();
      localStorage.clear();

      // Clear all cookies (including Supabase auth cookies)
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      });

      // Force redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Even on error, clear cookies and redirect
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border/50 flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/app-icon-dark.png"
              alt="IMSAM"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
            />
            <span className="font-display font-semibold text-xl text-foreground">
              IMSAM
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-mint/10 text-mint"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 w-1 h-8 bg-mint rounded-r-full"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/30">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint/20 to-soft-blue/20 flex items-center justify-center">
              <User className="w-5 h-5 text-mint" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.full_name || "사용자"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "로딩 중..."}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 w-full px-4 py-3 mt-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span className="font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
