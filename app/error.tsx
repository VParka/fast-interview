'use client'; // 에러 컴포넌트는 반드시 클라이언트 컴포넌트

// ============================================
// 📌 error.tsx - 에러 처리
// ============================================
// - 런타임 에러를 잡아서 표시
// - 에러 복구 기능 제공
// - 'use client' 필수!

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 서비스에 전송 가능
    console.error('에러 발생:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          문제가 발생했습니다!
        </h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={() => reset()} // 다시 시도
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

