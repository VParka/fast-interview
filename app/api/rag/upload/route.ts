// ============================================
// RAG Upload API - Document Upload & Embedding
// ============================================
// POST /api/rag/upload
// - Uploads document (PDF, TXT, DOC)
// - Generates embeddings
// - Stores in Supabase with pgvector

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { uploadDocument } from '@/lib/rag/service';
import { smartParsePDF } from '@/lib/rag/pdf-parser';
import type { DocumentType } from '@/types/interview';

export async function POST(req: NextRequest) {
  console.log('=== RAG Upload API Called ===');

  try {
    // Check authentication
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = (formData.get('type') as DocumentType) || 'resume';
    const metadataStr = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다.' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, file.type, file.size);

    // Validate file type
    const validTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '지원되지 않는 파일 형식입니다. (PDF, TXT, DOC, DOCX)' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // Extract text content from file
    let content = '';
    let parseMetadata: Record<string, unknown> = {};

    if (file.type === 'text/plain') {
      content = await file.text();
    } else if (file.type === 'application/pdf') {
      // Use LlamaParse for complex PDFs, basic extraction for simple ones
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      console.log('[Upload] Parsing PDF with smart parser...');
      const parseResult = await smartParsePDF(pdfBuffer, process.env.LLAMAPARSE_API_KEY);

      content = parseResult.text;
      parseMetadata = {
        pdf_pages: parseResult.metadata.pages,
        pdf_has_images: parseResult.metadata.hasImages,
        pdf_has_tables: parseResult.metadata.hasTables,
        pdf_parse_method: parseResult.metadata.parseMethod,
        pdf_parse_time_ms: parseResult.metadata.parseTimeMs,
      };

      console.log(`[Upload] PDF parsed: ${parseResult.metadata.pages} pages, method: ${parseResult.metadata.parseMethod}`);
    } else {
      // For DOC/DOCX, extract text
      // TODO: Use mammoth or docx library for better extraction
      content = await file.text();
    }

    // Clean up content
    content = content
      .replace(/\0/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();

    if (!content) {
      return NextResponse.json(
        { success: false, error: '파일에서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Parse metadata
    let metadata: Record<string, unknown> = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        // Ignore parsing error
      }
    }

    // Add file info to metadata
    metadata = {
      ...metadata,
      ...parseMetadata,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      type,
    };

    const userId = user.id;

    console.log('Uploading document for user:', userId);

    // Upload and embed document
    const document = await uploadDocument(userId, type, file.name, content, metadata);

    console.log('Document uploaded:', document.id);

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        filename: document.filename,
        metadata: document.metadata,
        created_at: document.created_at,
      },
    });
  } catch (error) {
    console.error('RAG Upload Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: '파일 업로드 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Route segment config for larger file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;
