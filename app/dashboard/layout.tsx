import Link from 'next/link';

// ============================================
// 📌 /dashboard/layout.tsx - 중첩 레이아웃
// ============================================
// - 이 레이아웃은 /dashboard 하위 모든 페이지에 적용
// - 루트 layout.tsx 내부에 렌더링됨

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h2 className="text-xl font-bold mb-8">관리자 패널</h2>
        <nav className="space-y-2">
          <Link
            href="/dashboard"
            className="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            📊 대시보드
          </Link>
          <Link
            href="/dashboard/users"
            className="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            👥 사용자 관리
          </Link>
          <Link
            href="/dashboard/settings"
            className="block px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            ⚙️ 설정
          </Link>
        </nav>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 bg-gray-100">{children}</main>
    </div>
  );
}

