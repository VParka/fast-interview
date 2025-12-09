// ============================================
// PDF Parser with LlamaParse Integration
// ============================================
// Handles complex PDF layouts (tables, multi-column, images)

import { PDFParse } from 'pdf-parse';

export interface PDFParseResult {
  text: string;
  metadata: {
    pages: number;
    hasImages: boolean;
    hasTables: boolean;
    parseMethod: 'llamaparse' | 'basic' | 'fallback';
    parseTimeMs: number;
  };
}

export interface LlamaParseConfig {
  apiKey?: string;
  resultType?: 'text' | 'markdown';
  language?: string;
  parsingInstructions?: string;
}

/**
 * Parse PDF using LlamaParse for complex layouts
 * Falls back to basic parsing if LlamaParse unavailable
 */
export async function parsePDFWithLlamaParse(
  pdfBuffer: Buffer,
  config: LlamaParseConfig = {}
): Promise<PDFParseResult> {
  const startTime = Date.now();
  const apiKey = config.apiKey || process.env.LLAMAPARSE_API_KEY;

  // Try LlamaParse if API key available
  if (apiKey) {
    try {
      console.log('[PDFParser] Attempting LlamaParse...');
      const result = await llamaParseRequest(pdfBuffer, apiKey, config);
      return {
        ...result,
        metadata: {
          ...result.metadata,
          parseMethod: 'llamaparse',
          parseTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.warn('[PDFParser] LlamaParse failed, falling back:', error);
    }
  }

  // Fallback to basic text extraction using pdf-parse
  console.log('[PDFParser] Using basic extraction with pdf-parse');
  return await basicPDFParse(pdfBuffer, startTime);
}

/**
 * LlamaParse API request
 * https://docs.llamaindex.ai/en/stable/examples/data_connectors/LlamaParseUsage/
 */
async function llamaParseRequest(
  pdfBuffer: Buffer,
  apiKey: string,
  config: LlamaParseConfig
): Promise<Omit<PDFParseResult, 'metadata'> & { metadata: Omit<PDFParseResult['metadata'], 'parseMethod' | 'parseTimeMs'> }> {
  const formData = new FormData();

  // Convert buffer to Blob for FormData (use Uint8Array for type compatibility)
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
  formData.append('file', blob, 'document.pdf');

  // Add configuration
  formData.append('result_type', config.resultType || 'text');
  formData.append('language', config.language || 'ko');

  if (config.parsingInstructions) {
    formData.append('parsing_instruction', config.parsingInstructions);
  }

  // LlamaParse API endpoint (v1)
  const response = await fetch('https://api.cloud.llamaindex.ai/api/v1/parsing/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LlamaParse API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  // Get job ID and poll for results
  const jobId = result.id;
  const parsedResult = await pollLlamaParseJob(jobId, apiKey);

  return {
    text: parsedResult.text,
    metadata: {
      pages: parsedResult.pages || 1,
      hasImages: parsedResult.hasImages || false,
      hasTables: parsedResult.hasTables || false,
    },
  };
}

/**
 * Poll LlamaParse job until completion
 */
async function pollLlamaParseJob(jobId: string, apiKey: string, maxAttempts: number = 30): Promise<{
  text: string;
  pages?: number;
  hasImages?: boolean;
  hasTables?: boolean;
}> {
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to poll job ${jobId}: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'SUCCESS') {
      return {
        text: result.output?.text || result.output || '',
        pages: result.metadata?.pages,
        hasImages: result.metadata?.hasImages,
        hasTables: result.metadata?.hasTables,
      };
    }

    if (result.status === 'ERROR') {
      throw new Error(`LlamaParse job failed: ${result.error || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`LlamaParse job timed out after ${maxAttempts} attempts`);
}

/**
 * Basic PDF text extraction using pdf-parse library (fallback)
 * Handles most PDFs reliably
 */
async function basicPDFParse(pdfBuffer: Buffer, startTime: number): Promise<PDFParseResult> {
  let parser: InstanceType<typeof PDFParse> | null = null;

  try {
    console.log('[PDFParser] Using pdf-parse library for extraction...');

    // Create PDF parser instance
    parser = new PDFParse({
      data: new Uint8Array(pdfBuffer),
    });

    // Extract text
    const textResult = await parser.getText();

    const text = textResult.text
      .replace(/\0/g, '') // Remove null characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();

    const pageCount = textResult.pages?.length || 1;
    console.log(`[PDFParser] pdf-parse extracted ${text.length} chars from ${pageCount} pages`);

    return {
      text,
      metadata: {
        pages: pageCount,
        hasImages: false,
        hasTables: false,
        parseMethod: 'basic',
        parseTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    console.error('[PDFParser] pdf-parse failed:', error);

    // Ultimate fallback - raw text extraction
    const text = pdfBuffer
      .toString('utf-8')
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text: text.slice(0, 50000), // Limit to 50k chars
      metadata: {
        pages: 1,
        hasImages: false,
        hasTables: false,
        parseMethod: 'fallback',
        parseTimeMs: Date.now() - startTime,
      },
    };
  } finally {
    // Clean up parser resources
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Detect if PDF has complex layout requiring LlamaParse
 */
export function shouldUseLlamaParse(pdfBuffer: Buffer): boolean {
  const pdfContent = pdfBuffer.toString('latin1', 0, Math.min(5000, pdfBuffer.length));

  // Check for table markers
  const hasTables = /\/Table|\/TR|\/TD|\/TH/i.test(pdfContent);

  // Check for image markers
  const hasImages = /\/Image|\/XObject/i.test(pdfContent);

  // Check for complex layouts (multiple columns, forms)
  const hasComplexLayout = /\/StructTreeRoot|\/Form|\/Annot/i.test(pdfContent);

  return hasTables || hasImages || hasComplexLayout;
}

/**
 * Smart PDF parser with auto-detection
 * - Uses LlamaParse for complex PDFs (tables, images, multi-column)
 * - Falls back to pdf-parse for simple PDFs
 */
export async function smartParsePDF(pdfBuffer: Buffer, llamaParseApiKey?: string): Promise<PDFParseResult> {
  const startTime = Date.now();
  const hasComplexLayout = shouldUseLlamaParse(pdfBuffer);

  // Use LlamaParse for complex PDFs if API key available
  if (hasComplexLayout && llamaParseApiKey) {
    console.log('[PDFParser] Complex layout detected, using LlamaParse');
    return parsePDFWithLlamaParse(pdfBuffer, {
      apiKey: llamaParseApiKey,
      resultType: 'text',
      language: 'ko',
      parsingInstructions: '한국어 자소서와 이력서 문서입니다. 모든 섹션과 내용을 정확하게 추출해주세요.',
    });
  }

  // Use pdf-parse for simple PDFs or when LlamaParse unavailable
  console.log('[PDFParser] Using pdf-parse for extraction');
  return await basicPDFParse(pdfBuffer, startTime);
}
