// ============================================
// 📌 template.tsx - 템플릿
// ============================================
// layout.tsx vs template.tsx 차이점:
//
// layout.tsx:
// - 상태 유지됨 (페이지 이동해도 리렌더링 안됨)
// - 한 번만 마운트
//
// template.tsx:
// - 페이지 이동할 때마다 새로 마운트
// - 페이지 전환 애니메이션에 유용
// - 페이지별 진입 로깅에 유용

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fadeIn">
      {children}
    </div>
  );
}

// globals.css에 추가 필요:
// @keyframes fadeIn {
//   from { opacity: 0; transform: translateY(10px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-fadeIn {
//   animation: fadeIn 0.3s ease-out;
// }

