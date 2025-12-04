import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 📌 /api/users/[id] - 동적 라우트
// ============================================
// URL 예시: /api/users/1, /api/users/123

type Params = {
  params: Promise<{ id: string }>;
};

// GET - 특정 사용자 조회
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // 실제로는 DB에서 조회
  // const user = await db.user.findUnique({ where: { id } });

  return NextResponse.json({
    success: true,
    data: {
      id: parseInt(id),
      name: '사용자 ' + id,
      email: `user${id}@example.com`,
    },
  });
}

// PUT - 특정 사용자 전체 업데이트
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  return NextResponse.json({
    success: true,
    message: `사용자 ${id} 업데이트 완료`,
    data: { id: parseInt(id), ...body },
  });
}

// DELETE - 특정 사용자 삭제
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  return NextResponse.json({
    success: true,
    message: `사용자 ${id} 삭제 완료`,
  });
}

