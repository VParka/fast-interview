// ============================================
// Interview Question PDF Parser
// ============================================
// Parses interview questions from PDF files
// Format: "No | 카테고리 | 문제" table structure

import { smartParsePDF, parsePDFWithLlamaParse } from './pdf-parser';
import type { JobCategory } from '@/types/interview';

export interface ParsedQuestion {
  no: number;
  category: string;
  question: string;
  sourceCompany?: string;
}

export interface QuestionParseResult {
  questions: ParsedQuestion[];
  metadata: {
    totalFound: number;
    jobCategory: JobCategory;
    parseMethod: string;
    parseTimeMs: number;
  };
}

// Job category mapping from PDF filename
const JOB_CATEGORY_MAP: Record<string, JobCategory> = {
  '개발자기출': 'frontend',
  '프론트엔드기출': 'frontend',
  '백엔드기출': 'backend',
  'PM기출': 'pm',
  '데이터기출': 'data',
  '마케팅기출': 'marketing',
};

/**
 * Detect job category from filename
 */
export function detectJobCategory(filename: string): JobCategory {
  const cleanName = filename.replace(/\.pdf$/i, '').trim();

  for (const [pattern, category] of Object.entries(JOB_CATEGORY_MAP)) {
    if (cleanName.includes(pattern)) {
      return category;
    }
  }

  // Default to frontend for developer-related PDFs
  if (cleanName.includes('개발') || cleanName.includes('기술')) {
    return 'frontend';
  }

  return 'frontend'; // Default fallback
}

/**
 * Parse interview questions from PDF buffer
 */
export async function parseInterviewQuestionsPDF(
  pdfBuffer: Buffer,
  jobCategory?: JobCategory,
  filename?: string
): Promise<QuestionParseResult> {
  const startTime = Date.now();

  // Detect job category from filename if not provided
  const category = jobCategory || (filename ? detectJobCategory(filename) : 'frontend');

  // Parse PDF with LlamaParse for better table extraction
  const llamaParseApiKey = process.env.LLAMAPARSE_API_KEY;

  let parseResult;
  if (llamaParseApiKey) {
    parseResult = await parsePDFWithLlamaParse(pdfBuffer, {
      apiKey: llamaParseApiKey,
      resultType: 'text',
      language: 'ko',
      parsingInstructions: `이 문서는 면접 기출문제 PDF입니다.
테이블 형식으로 "No | 카테고리 | 문제"가 포함되어 있습니다.
모든 질문을 번호, 카테고리, 문제 내용을 포함하여 정확하게 추출해주세요.
기업 출처가 있으면 함께 추출해주세요.`,
    });
  } else {
    parseResult = await smartParsePDF(pdfBuffer);
  }

  // Extract questions from parsed text
  const questions = extractQuestionsFromText(parseResult.text);

  return {
    questions,
    metadata: {
      totalFound: questions.length,
      jobCategory: category,
      parseMethod: parseResult.metadata.parseMethod,
      parseTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Extract questions from parsed PDF text
 * Handles multiple formats:
 * 1. "문제N \t 카테고리 \t 질문" PDF format (primary)
 * 2. "No | 카테고리 | 문제" table format
 * 3. Numbered list format "1. [카테고리] 질문"
 * 4. Plain numbered format "1. 질문"
 */
export function extractQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  // Primary Pattern: "문제N \t 카테고리 \t 질문" (PDF 기출문제 형식)
  // e.g., "문제1 	직무역할 	서비스 기획자가 하는 일이 무엇이라고 생각하나요?"
  const pdfQuestionPattern = /^문제(\d+)\s+(\S+)\s+(.+)$/;

  // Pattern 2: Table format "번호 | 카테고리 | 문제"
  const tablePattern = /^(\d+)\s*[|｜]\s*([^|｜]+)\s*[|｜]\s*(.+)$/;

  // Pattern 3: Numbered with category "[카테고리] 질문"
  const numberedCategoryPattern = /^(\d+)[.)]\s*\[([^\]]+)\]\s*(.+)$/;

  // Pattern 4: Plain numbered "번호. 질문"
  const plainNumberedPattern = /^(\d+)[.)]\s+(.+)$/;

  // Pattern 5: Company source pattern
  const sourcePattern = /\(출처[：:]\s*([^)]+)\)|\[출처[：:]\s*([^\]]+)\]$/;

  let currentCategory = '기타';
  let questionNo = 0;

  // Handle multi-line questions (where question continues on next line)
  let pendingQuestion: { no: number; category: string; question: string } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines and page markers
    if (line.includes('카테고리') && line.includes('문제') && line.includes('No')) continue;
    if (line.startsWith('PART') || line.startsWith('Part')) continue;
    if (line.match(/^페이지|^Page/i)) continue;
    if (line.match(/^-- \d+ of \d+ --$/)) continue;
    if (line.match(/^\d+$/)) continue; // Page numbers only
    if (line.match(/^1\.4\$\)00-/)) continue; // PDF header artifacts

    // Try PDF question format first (primary pattern for 기출문제)
    let match = line.match(pdfQuestionPattern);
    if (match) {
      // Save any pending multi-line question
      if (pendingQuestion) {
        const question = cleanQuestionText(pendingQuestion.question);
        if (question.length >= 10) {
          const sourceMatch = question.match(sourcePattern);
          questions.push({
            no: pendingQuestion.no,
            category: pendingQuestion.category,
            question: question.replace(sourcePattern, '').trim(),
            sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
          });
        }
        pendingQuestion = null;
      }

      const [, no, category, questionText] = match;
      // Check if this line ends with incomplete question (no punctuation)
      const endsWithPunctuation = /[?!.。？！]$/.test(questionText.trim());

      if (!endsWithPunctuation && i + 1 < lines.length) {
        // This might be a multi-line question
        pendingQuestion = {
          no: parseInt(no, 10),
          category: category.trim(),
          question: questionText.trim(),
        };
      } else {
        const question = cleanQuestionText(questionText);
        const sourceMatch = question.match(sourcePattern);
        questions.push({
          no: parseInt(no, 10),
          category: category.trim(),
          question: question.replace(sourcePattern, '').trim(),
          sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
        });
      }
      currentCategory = category.trim();
      continue;
    }

    // Check if this is a continuation of a pending multi-line question
    if (pendingQuestion && !line.match(/^문제\d+/) && !line.match(/^(\d+)\s*[|｜]/)) {
      // Append to pending question if it looks like continuation
      if (!line.includes('No') && !line.includes('카테고리')) {
        pendingQuestion.question += ' ' + line;

        // Check if now complete
        const endsWithPunctuation = /[?!.。？！]$/.test(line.trim());
        if (endsWithPunctuation) {
          const question = cleanQuestionText(pendingQuestion.question);
          if (question.length >= 10) {
            const sourceMatch = question.match(sourcePattern);
            questions.push({
              no: pendingQuestion.no,
              category: pendingQuestion.category,
              question: question.replace(sourcePattern, '').trim(),
              sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
            });
          }
          pendingQuestion = null;
        }
        continue;
      }
    }

    // Try table format
    match = line.match(tablePattern);
    if (match) {
      const [, no, category, questionText] = match;
      const question = cleanQuestionText(questionText);
      const sourceMatch = question.match(sourcePattern);

      questions.push({
        no: parseInt(no, 10),
        category: category.trim(),
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
      currentCategory = category.trim();
      continue;
    }

    // Try numbered with category format
    match = line.match(numberedCategoryPattern);
    if (match) {
      const [, no, category, questionText] = match;
      const question = cleanQuestionText(questionText);
      const sourceMatch = question.match(sourcePattern);

      questions.push({
        no: parseInt(no, 10),
        category: category.trim(),
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
      currentCategory = category.trim();
      continue;
    }

    // Try plain numbered format (as fallback)
    match = line.match(plainNumberedPattern);
    if (match) {
      const [, no, questionText] = match;
      const question = cleanQuestionText(questionText);

      // Skip if it's too short or doesn't look like a question
      if (question.length < 10) continue;
      if (!isLikelyQuestion(question)) continue;

      const sourceMatch = question.match(sourcePattern);
      questionNo = parseInt(no, 10);

      questions.push({
        no: questionNo,
        category: currentCategory,
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
      continue;
    }

    // Check for category header lines
    const categoryMatch = line.match(/^(?:카테고리|분류)[：:]\s*(.+)$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
    }
  }

  // Don't forget any remaining pending question
  if (pendingQuestion) {
    const question = cleanQuestionText(pendingQuestion.question);
    if (question.length >= 10) {
      const sourceMatch = question.match(sourcePattern);
      questions.push({
        no: pendingQuestion.no,
        category: pendingQuestion.category,
        question: question.replace(sourcePattern, '').trim(),
        sourceCompany: sourceMatch ? (sourceMatch[1] || sourceMatch[2])?.trim() : undefined,
      });
    }
  }

  // Deduplicate questions by text
  const seen = new Set<string>();
  return questions.filter(q => {
    const key = q.question.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Clean question text
 */
function cleanQuestionText(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/^[-•·]\s*/, '')       // Remove bullet points
    .replace(/\?{2,}/g, '?')        // Multiple question marks to single
    .trim();
}

/**
 * Check if text looks like an interview question
 */
function isLikelyQuestion(text: string): boolean {
  // Must end with question mark or contain question words
  const endsWithQuestion = text.endsWith('?');
  const hasQuestionWords = /어떻게|무엇|왜|어디|언제|설명|경험|대처|해결|극복/.test(text);
  const hasActionWords = /하셨|했던|해본|말씀|설명해|알려/.test(text);

  return endsWithQuestion || hasQuestionWords || hasActionWords;
}

/**
 * Parse all PDF files in a directory
 */
export async function parseAllQuestionPDFs(
  pdfFiles: Array<{ buffer: Buffer; filename: string }>
): Promise<Map<JobCategory, ParsedQuestion[]>> {
  const results = new Map<JobCategory, ParsedQuestion[]>();

  for (const { buffer, filename } of pdfFiles) {
    console.log(`[QuestionParser] Processing: ${filename}`);

    try {
      const result = await parseInterviewQuestionsPDF(buffer, undefined, filename);
      const existing = results.get(result.metadata.jobCategory) || [];
      results.set(result.metadata.jobCategory, [...existing, ...result.questions]);

      console.log(`[QuestionParser] Found ${result.questions.length} questions in ${filename}`);
    } catch (error) {
      console.error(`[QuestionParser] Failed to parse ${filename}:`, error);
    }
  }

  return results;
}
