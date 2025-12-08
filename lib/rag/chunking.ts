// ============================================
// Intelligent Chunking for Korean Cover Letters
// ============================================
// Optimized for HR documents with semantic structure preservation

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  section?: string;
  chunkType: 'header' | 'content' | 'mixed';
  charCount: number;
  tokenEstimate: number;
}

export interface Chunk {
  content: string;
  metadata: ChunkMetadata;
}

// Korean cover letter common section patterns
const KOREAN_SECTION_PATTERNS = [
  // 지원동기
  /(?:^|\n)(?:1\.|①|▪|■|\*)\s*(?:지원\s*동기|지원\s*이유|입사\s*동기)/i,
  // 성장과정
  /(?:^|\n)(?:2\.|②|▪|■|\*)\s*(?:성장\s*과정|자기\s*소개|배경)/i,
  // 경력/경험
  /(?:^|\n)(?:3\.|③|▪|■|\*)\s*(?:경력|경험|주요\s*업무|프로젝트)/i,
  // 입사 후 포부
  /(?:^|\n)(?:4\.|④|▪|■|\*)\s*(?:입사\s*후|포부|비전|기여)/i,
  // 장단점
  /(?:^|\n)(?:5\.|⑤|▪|■|\*)\s*(?:장점|단점|강점|약점|특기)/i,
];

// Sentence ending patterns for Korean
const KOREAN_SENTENCE_ENDINGS = [
  '다.',
  '요.',
  '습니다.',
  '했습니다.',
  '입니다.',
  '였습니다.',
  '있습니다.',
  '됩니다.',
];

export class KoreanChunker {
  private maxChunkSize: number;
  private overlapSize: number;
  private minChunkSize: number;

  constructor(
    maxChunkSize: number = 800,
    overlapSize: number = 100,
    minChunkSize: number = 200
  ) {
    this.maxChunkSize = maxChunkSize;
    this.overlapSize = overlapSize;
    this.minChunkSize = minChunkSize;
  }

  /**
   * Main chunking method with section-aware splitting
   */
  chunk(content: string, metadata: Record<string, unknown> = {}): Chunk[] {
    // Clean and normalize content
    const cleanedContent = this.normalizeContent(content);

    // Try section-based chunking first (best for structured documents)
    const sections = this.extractSections(cleanedContent);

    if (sections.length > 1) {
      return this.chunkBySections(sections, metadata);
    }

    // Fallback to semantic sentence-based chunking
    return this.chunkBySentences(cleanedContent, metadata);
  }

  /**
   * Normalize Korean text (remove excessive whitespace, fix encoding issues)
   */
  private normalizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .trim();
  }

  /**
   * Extract sections based on Korean cover letter patterns
   */
  private extractSections(content: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    let currentSection = { title: 'introduction', content: '' };
    let lastIndex = 0;

    // Find all section headers
    const matches: Array<{ index: number; title: string }> = [];

    for (const pattern of KOREAN_SECTION_PATTERNS) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        matches.push({
          index: match.index,
          title: match[0].trim(),
        });
      }
    }

    // Sort by position
    matches.sort((a, b) => a.index - b.index);

    // If no sections found, return whole content
    if (matches.length === 0) {
      return [{ title: 'full_content', content }];
    }

    // Extract content for each section
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];

      // Add previous section
      if (lastIndex < match.index) {
        currentSection.content = content.substring(lastIndex, match.index).trim();
        if (currentSection.content) {
          sections.push(currentSection);
        }
      }

      // Start new section
      const nextIndex = i < matches.length - 1 ? matches[i + 1].index : content.length;
      currentSection = {
        title: match.title,
        content: content.substring(match.index, nextIndex).trim(),
      };
      lastIndex = nextIndex;
    }

    // Add last section
    if (currentSection.content) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Chunk by sections (preserves document structure)
   */
  private chunkBySections(
    sections: Array<{ title: string; content: string }>,
    metadata: Record<string, unknown>
  ): Chunk[] {
    const chunks: Chunk[] = [];
    let globalChunkIndex = 0;

    for (const section of sections) {
      const sectionContent = section.content;

      if (sectionContent.length <= this.maxChunkSize) {
        // Section fits in one chunk
        chunks.push({
          content: sectionContent,
          metadata: {
            chunkIndex: globalChunkIndex++,
            totalChunks: 0, // Will update later
            section: section.title,
            chunkType: 'content',
            charCount: sectionContent.length,
            tokenEstimate: this.estimateTokens(sectionContent),
            ...metadata,
          },
        });
      } else {
        // Section needs splitting
        const sectionChunks = this.splitLargeSection(sectionContent, section.title);

        for (const chunk of sectionChunks) {
          chunks.push({
            content: chunk,
            metadata: {
              chunkIndex: globalChunkIndex++,
              totalChunks: 0,
              section: section.title,
              chunkType: 'content',
              charCount: chunk.length,
              tokenEstimate: this.estimateTokens(chunk),
              ...metadata,
            },
          });
        }
      }
    }

    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = totalChunks;
    });

    return chunks;
  }

  /**
   * Split large section while preserving semantic boundaries
   */
  private splitLargeSection(content: string, sectionTitle: string): string[] {
    const sentences = this.splitIntoSentences(content);
    const chunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (potentialChunk.length > this.maxChunkSize && currentChunk.length >= this.minChunkSize) {
        // Save current chunk
        chunks.push(currentChunk.trim());

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(sentences, i, this.overlapSize);
        currentChunk = overlapSentences + sentence;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Chunk by sentences (fallback for unstructured content)
   */
  private chunkBySentences(content: string, metadata: Record<string, unknown>): Chunk[] {
    const sentences = this.splitIntoSentences(content);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (potentialChunk.length > this.maxChunkSize && currentChunk.length >= this.minChunkSize) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunkIndex: chunkIndex++,
            totalChunks: 0,
            chunkType: 'content',
            charCount: currentChunk.length,
            tokenEstimate: this.estimateTokens(currentChunk),
            ...metadata,
          },
        });

        // Start new chunk with overlap
        const overlapSentences = this.getOverlapSentences(sentences, i, this.overlapSize);
        currentChunk = overlapSentences + sentence;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunkIndex: chunkIndex++,
          totalChunks: 0,
          chunkType: 'content',
          charCount: currentChunk.length,
          tokenEstimate: this.estimateTokens(currentChunk),
          ...metadata,
        },
      });
    }

    // Update total chunks count
    const totalChunks = chunks.length;
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = totalChunks;
    });

    return chunks;
  }

  /**
   * Split Korean text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    const sentences: string[] = [];
    let currentSentence = '';

    // Split by Korean sentence endings
    const parts = text.split(/([.!?]+)/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (!part.trim()) continue;

      currentSentence += part;

      // Check if this is a sentence ending
      if (/[.!?]+/.test(part)) {
        // Check if it's a real ending (not abbreviation)
        const trimmed = currentSentence.trim();

        if (trimmed && this.isRealSentenceEnding(trimmed)) {
          sentences.push(trimmed);
          currentSentence = '';
        }
      }
    }

    // Add remaining text
    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    return sentences;
  }

  /**
   * Check if a sentence ending is real (not abbreviation like "주식회사.", "약 10.5m")
   */
  private isRealSentenceEnding(sentence: string): boolean {
    // Ignore very short sentences (likely abbreviations)
    if (sentence.length < 10) return false;

    // Check for Korean sentence ending patterns
    for (const ending of KOREAN_SENTENCE_ENDINGS) {
      if (sentence.endsWith(ending)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get overlap sentences for chunk continuity
   */
  private getOverlapSentences(sentences: string[], currentIndex: number, overlapSize: number): string {
    let overlap = '';
    let charCount = 0;

    for (let i = currentIndex - 1; i >= 0 && charCount < overlapSize; i--) {
      const sentence = sentences[i];
      if (charCount + sentence.length > overlapSize) break;

      overlap = sentence + ' ' + overlap;
      charCount += sentence.length;
    }

    return overlap.trim() ? overlap.trim() + ' ' : '';
  }

  /**
   * Estimate token count (rough approximation for Korean)
   * Korean tokens: ~1.5 characters per token on average
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 1.5);
  }
}

// Singleton instance with optimized defaults for cover letters
export const koreanChunker = new KoreanChunker(
  800,  // maxChunkSize: Optimal for text-embedding-3-small
  100,  // overlapSize: 100 chars overlap for context continuity
  200   // minChunkSize: Avoid too-small chunks
);

// Utility function
export function chunkKoreanDocument(
  content: string,
  metadata?: Record<string, unknown>
): Chunk[] {
  return koreanChunker.chunk(content, metadata);
}
