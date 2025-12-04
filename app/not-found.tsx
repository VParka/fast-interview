import Link from 'next/link';

// ============================================
// 📌 not-found.tsx - 404 페이지
// ============================================
// - 존재하지 않는 페이지 접근 시 표시
// - notFound() 함수 호출 시에도 표시

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mt-4">
          페이지를 찾을 수 없습니다
        </h2>
        <p className="text-gray-600 mt-2 mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

