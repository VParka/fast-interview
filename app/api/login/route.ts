import { NextRequest, NextResponse } from 'next/server';

// ============================================
// 📌 route.ts - API 라우트 핸들러
// ============================================
// 지원 메서드: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS

// ============================================
// 1️⃣ GET - 데이터 조회
// ============================================
export async function GET(request: NextRequest) {
  // URL 파라미터 가져오기
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query'); // ?query=value

  return NextResponse.json({
    success: true,
    message: 'GET 요청 성공',
    query: query,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// 2️⃣ POST - 데이터 생성
// ============================================
export async function POST(request: NextRequest) {
  try {
    // JSON 바디 파싱
    const body = await request.json();
    const { email, password } = body;

    // 유효성 검사
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력하세요' },
        { status: 400 }
      );
    }

    // 로그인 로직 (예시)
    // const user = await db.user.findUnique({ where: { email } });

    return NextResponse.json({
      success: true,
      message: '로그인 성공',
      user: { email },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다' },
      { status: 400 }
    );
  }
}

// ============================================
// 3️⃣ PUT - 전체 업데이트
// ============================================
export async function PUT(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    success: true,
    message: 'PUT 요청 - 전체 업데이트',
    data: body,
  });
}

// ============================================
// 4️⃣ PATCH - 부분 업데이트
// ============================================
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    success: true,
    message: 'PATCH 요청 - 부분 업데이트',
    data: body,
  });
}

// ============================================
// 5️⃣ DELETE - 데이터 삭제
// ============================================
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  return NextResponse.json({
    success: true,
    message: `DELETE 요청 - ID ${id} 삭제`,
  });
}

// ============================================
// 📌 응답 옵션들
// ============================================
// 헤더 설정 예시:
// return NextResponse.json(data, {
//   status: 201,
//   headers: {
//     'Content-Type': 'application/json',
//     'Cache-Control': 'no-store',
//   },
// });

// 리다이렉트 예시:
// return NextResponse.redirect(new URL('/login', request.url));

// 쿠키 설정 예시:
// const response = NextResponse.json({ success: true });
// response.cookies.set('token', 'abc123', { httpOnly: true });
// return response;
