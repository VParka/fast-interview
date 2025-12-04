// ============================================
// 📌 /dashboard - 대시보드 페이지
// ============================================

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold">총 사용자</h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">1,234</p>
        </div>
        <div className="bg-green-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold">오늘 방문자</h2>
          <p className="text-4xl font-bold text-green-600 mt-2">567</p>
        </div>
        <div className="bg-purple-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold">전환율</h2>
          <p className="text-4xl font-bold text-purple-600 mt-2">12.3%</p>
        </div>
      </div>
    </div>
  );
}

