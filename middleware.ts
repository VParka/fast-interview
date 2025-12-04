import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// 📌 middleware.ts - 미들웨어
// ============================================
// - 요청이 완료되기 전에 코드 실행
// - 리다이렉트, 리라이트, 헤더 수정 등 가능
// - app 폴더와 같은 레벨에 위치해야 함!

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 예시 1: 인증 체크
  // const token = request.cookies.get('auth-token');
  // if (!token && pathname.startsWith('/dashboard')) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  // 예시 2: 로깅
  console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);

  // 예시 3: 헤더 추가
  const response = NextResponse.next();
  response.headers.set('x-custom-header', 'my-value');

  // 예시 4: 특정 경로 리다이렉트
  if (pathname === '/old-page') {
    return NextResponse.redirect(new URL('/new-page', request.url));
  }

  // 예시 5: 지역화 (i18n)
  // const locale = request.headers.get('accept-language')?.split(',')[0] || 'ko';
  // if (!pathname.startsWith('/ko') && !pathname.startsWith('/en')) {
  //   return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  // }

  return response;
}

// ============================================
// 📌 config.matcher - 미들웨어 적용 경로
// ============================================
export const config = {
  // 특정 경로에만 적용
  matcher: [
    // 모든 페이지 (정적 파일 제외)
    '/((?!_next/static|_next/image|favicon.ico).*)',

    // 또는 특정 경로만:
    // '/dashboard/:path*',
    // '/api/:path*',
  ],
};

