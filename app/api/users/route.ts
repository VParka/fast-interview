import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 📌 /api/users - 사용자 목록 API
// ============================================

// 임시 데이터 (실제로는 DB 사용)
const users = [
  { id: 1, name: '김철수', email: 'kim@example.com' },
  { id: 2, name: '이영희', email: 'lee@example.com' },
  { id: 3, name: '박지민', email: 'park@example.com' },
];

// GET - 전체 사용자 조회
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  return NextResponse.json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total: users.length,
    },
  });
}

// POST - 새 사용자 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: '이름과 이메일은 필수입니다' },
        { status: 400 }
      );
    }

    const newUser = {
      id: users.length + 1,
      name,
      email,
    };

    return NextResponse.json(
      { success: true, data: newUser },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청' },
      { status: 400 }
    );
  }
}

