// ============================================
// 📌 /dashboard/[id] - 동적 라우트 페이지
// ============================================
// URL 예시: /dashboard/1, /dashboard/abc

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">상세 페이지</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-lg">
          <strong>ID:</strong> {id}
        </p>
        <p className="text-lg mt-2">
          <strong>쿼리 파라미터:</strong> {JSON.stringify(query)}
        </p>
      </div>
    </div>
  );
}

// ============================================
// 📌 generateStaticParams - 정적 생성
// ============================================
// 빌드 시 미리 페이지 생성 (SSG)
export async function generateStaticParams() {
  // 실제로는 DB나 API에서 데이터 가져옴
  return [{ id: '1' }, { id: '2' }, { id: '3' }];
}

// ============================================
// 📌 generateMetadata - 동적 메타데이터
// ============================================
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `대시보드 - ${id}`,
    description: `${id}번 항목의 상세 페이지`,
  };
}

