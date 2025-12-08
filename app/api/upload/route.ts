import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

// ============================================
// /api/upload - Secure File Upload API
// ============================================

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx"];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Sanitize filename - Prevent Path Traversal
function sanitizeFilename(filename: string): string {
  let sanitized = filename
    .replace(/[/\\:*?"<>|]/g, "") // Remove path separators
    .replace(/\.\./g, "") // Prevent Path Traversal
    .replace(/^\.+/, "") // Remove leading dots
    .trim();

  if (!sanitized) sanitized = "unnamed_file";

  if (sanitized.length > 100) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 100 - ext.length) + ext;
  }

  return sanitized;
}

// Validate file magic number
function validateFileMagicNumber(buffer: Buffer, expectedType: string): boolean {
  if (expectedType === "application/pdf") {
    return buffer.length >= 4 &&
      buffer[0] === 0x25 && buffer[1] === 0x50 &&
      buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
  }
  if (expectedType.includes("msword") || expectedType.includes("officedocument")) {
    return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B; // PK (ZIP)
  }
  if (expectedType === "text/plain") {
    const text = buffer.toString("utf-8");
    // eslint-disable-next-line no-control-regex
    return !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text.substring(0, 1000));
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
              // Ignore cookie errors in server context
            }
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 2. File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 3. MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "허용되지 않는 파일 형식입니다. (PDF, TXT, DOC, DOCX만 허용)" },
        { status: 400 }
      );
    }

    // 4. File extension validation
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: "허용되지 않는 파일 확장자입니다." },
        { status: 400 }
      );
    }

    // 5. File content validation (magic number)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateFileMagicNumber(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: "파일 내용이 확장자와 일치하지 않습니다." },
        { status: 400 }
      );
    }

    // 6. Generate safe filename
    const sanitizedName = sanitizeFilename(file.name);
    const randomId = crypto.randomBytes(16).toString("hex");
    const safeFilename = `${user.id.substring(0, 8)}_${Date.now()}_${randomId}${ext}`;

    // 7. Validate path and save
    const uploadDir = path.join(process.cwd(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, safeFilename);
    const resolvedPath = path.resolve(filepath);

    // Final Path Traversal defense
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
      return NextResponse.json(
        { success: false, error: "잘못된 파일 경로입니다." },
        { status: 400 }
      );
    }

    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      filename: safeFilename,
      originalName: sanitizedName,
      url: `/uploads/${safeFilename}`,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
