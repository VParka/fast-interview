import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

// ============================================
// 📌 /api/upload - 파일 업로드 API
// ============================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다' },
        { status: 400 }
      );
    }

    // 파일 정보
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 파일 저장 경로
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(process.cwd(), 'public/uploads', filename);

    // 파일 저장
    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      url: `/uploads/${filename}`,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '업로드 실패' },
      { status: 500 }
    );
  }
}

// 파일 크기 제한 설정
export const config = {
  api: {
    bodyParser: false, // formData 사용 시 비활성화
  },
};

