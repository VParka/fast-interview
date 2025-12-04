'use server';

// ============================================
// 📌 Server Actions - 서버 액션
// ============================================
// - 'use server' 지시어로 서버에서만 실행
// - form action, onClick 등에서 직접 호출 가능
// - API 라우트 없이 서버 로직 실행

// 예시 1: 폼 제출 처리
export async function submitForm(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // DB 저장 로직
  console.log('서버에서 처리:', { name, email });

  // 응답 반환
  return { success: true, message: '저장 완료' };
}

// 예시 2: 데이터 가져오기
export async function fetchUserData(userId: string) {
  // DB에서 사용자 조회
  // const user = await prisma.user.findUnique({ where: { id: userId } });

  return {
    id: userId,
    name: '홍길동',
    email: 'hong@example.com',
  };
}

// 예시 3: 인증 처리
export async function loginAction(email: string, password: string) {
  // 인증 로직
  if (email === 'test@test.com' && password === '1234') {
    // 세션/쿠키 설정
    return { success: true, user: { email } };
  }

  return { success: false, error: '인증 실패' };
}

// 예시 4: 재검증 (Revalidation)
import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateAndRevalidate() {
  // DB 업데이트 후...

  // 특정 경로 재검증
  revalidatePath('/dashboard');

  // 또는 특정 태그 재검증
  revalidateTag('users');
}

