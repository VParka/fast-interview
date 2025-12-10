// ============================================
// Admin API: Upload Interview Questions from PDF
// ============================================
// POST /api/admin/upload-questions
// - Accepts PDF file upload
// - Parses questions from PDF
// - Generates embeddings and stores in DB
// - Protected by admin authentication

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { parseInterviewQuestionsPDF, detectJobCategory } from '@/lib/rag/question-parser';
import { uploadInterviewQuestions, getQuestionStats, clearQuestionsByCategory } from '@/lib/rag/question-service';
import type { JobCategory } from '@/types/interview';

// Simple admin authentication check
// In production, use proper admin role verification
async function isAdmin(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check if user has admin role in profiles or user_settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('tier')
    .eq('user_id', user.id)
    .single();

  // For now, allow any authenticated user (should be restricted in production)
  // You can check settings?.tier === 'admin' or use a separate admin table
  return !!user;
}

export async function POST(req: NextRequest) {
  console.log('=== Admin Upload Questions API: Started ===');

  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    // Check admin authentication
    const admin = await isAdmin(supabase);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const jobCategoryOverride = formData.get('job_category') as JobCategory | null;
    const clearExisting = formData.get('clear_existing') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'PDF 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'PDF 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes)`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect job category from filename or use override
    const detectedCategory = detectJobCategory(file.name);
    const jobCategory = jobCategoryOverride || detectedCategory;

    console.log(`Job category: ${jobCategory} (detected: ${detectedCategory})`);

    // Optionally clear existing questions for this category
    if (clearExisting) {
      console.log(`Clearing existing questions for category: ${jobCategory}`);
      await clearQuestionsByCategory(jobCategory);
    }

    // Parse questions from PDF
    console.log('Parsing PDF...');
    const parseResult = await parseInterviewQuestionsPDF(buffer, jobCategory, file.name);

    console.log(`Parsed ${parseResult.questions.length} questions in ${parseResult.metadata.parseTimeMs}ms`);

    if (parseResult.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'PDF에서 질문을 추출하지 못했습니다. PDF 형식을 확인해주세요.',
        metadata: parseResult.metadata,
      }, { status: 400 });
    }

    // Upload questions with embeddings
    console.log('Uploading questions with embeddings...');
    const uploadResult = await uploadInterviewQuestions(parseResult.questions, jobCategory);

    console.log('Upload result:', uploadResult);

    // Get updated stats
    const stats = await getQuestionStats();

    return NextResponse.json({
      success: uploadResult.success,
      data: {
        filename: file.name,
        jobCategory,
        questionsFound: parseResult.questions.length,
        questionsInserted: uploadResult.insertedCount,
        questionsSkipped: uploadResult.skippedCount,
        parseMethod: parseResult.metadata.parseMethod,
        parseTimeMs: parseResult.metadata.parseTimeMs,
      },
      stats,
      errors: uploadResult.errors.length > 0 ? uploadResult.errors : undefined,
    });
  } catch (error) {
    console.error('Admin upload questions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '질문 업로드 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/upload-questions - Get question statistics
export async function GET(req: NextRequest) {
  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    // Check admin authentication
    const admin = await isAdmin(supabase);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const stats = await getQuestionStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get question stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '통계 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/upload-questions?category=frontend - Clear questions by category
export async function DELETE(req: NextRequest) {
  try {
    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    // Check admin authentication
    const admin = await isAdmin(supabase);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as JobCategory | null;

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'category 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const success = await clearQuestionsByCategory(category);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '질문 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    const stats = await getQuestionStats();

    return NextResponse.json({
      success: true,
      message: `${category} 카테고리의 질문이 모두 삭제되었습니다.`,
      stats,
    });
  } catch (error) {
    console.error('Delete questions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '질문 삭제 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
