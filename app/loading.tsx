// ============================================
// 📌 loading.tsx - 로딩 UI
// ============================================
// - 페이지나 레이아웃이 로드되는 동안 자동으로 표시
// - React Suspense 기반
// - 스트리밍 렌더링 지원

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* 스피너 */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-lg text-gray-600">로딩 중...</p>
      </div>
    </div>
  );
}

