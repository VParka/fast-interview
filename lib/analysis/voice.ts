// ============================================
// Voice Analysis - Speech Patterns & Emotion
// ============================================
// Analyzes WPM, filler words, silence patterns, confidence

import type { TranscriptionWord } from '@/lib/stt/service';

export interface VoiceAnalysisResult {
  wpm: number;                    // Words per minute
  totalWords: number;
  fillerWordCount: number;
  fillerWordRate: number;         // % of total words
  fillerWords: FillerWordStats[];
  silenceStats: SilenceStats;
  speakingTime: number;           // seconds
  totalDuration: number;          // seconds
  confidence: VoiceConfidenceScore;
}

export interface FillerWordStats {
  word: string;
  count: number;
  category: 'hesitation' | 'emphasis' | 'thinking';
}

export interface SilenceStats {
  totalSilenceTime: number;       // seconds
  silenceCount: number;
  avgSilenceLength: number;       // seconds
  longPauses: number;             // pauses > 2s
  silenceRate: number;            // % of total time
}

export interface VoiceConfidenceScore {
  overall: number;                // 0-100
  factors: {
    speechPace: number;           // 0-100 (optimal WPM range)
    fluency: number;              // 0-100 (low filler words)
    articulation: number;         // 0-100 (consistent pace)
  };
}

// Korean filler words with categories
const KOREAN_FILLER_WORDS: Record<string, 'hesitation' | 'emphasis' | 'thinking'> = {
  // Hesitation
  '음': 'hesitation',
  '어': 'hesitation',
  '으': 'hesitation',
  '아': 'hesitation',
  '저': 'hesitation',
  '에': 'hesitation',

  // Thinking
  '그': 'thinking',
  '그게': 'thinking',
  '그러니까': 'thinking',
  '저기': 'thinking',
  '뭐': 'thinking',
  '이제': 'thinking',

  // Emphasis (often overused)
  '진짜': 'emphasis',
  '좀': 'emphasis',
  '되게': 'emphasis',
  '완전': 'emphasis',
  '엄청': 'emphasis',
};

/**
 * Analyze voice patterns from transcription with word timings
 */
export function analyzeVoice(
  text: string,
  words: TranscriptionWord[] = [],
  audioDurationSeconds?: number
): VoiceAnalysisResult {
  // Extract timing info
  const duration = audioDurationSeconds || (words.length > 0 ? words[words.length - 1].end : 0);

  // Calculate speaking time (total time minus silences)
  const silenceStats = calculateSilenceStats(words, duration);
  const speakingTime = duration - silenceStats.totalSilenceTime;

  // Count words
  const wordList = text.split(/\s+/).filter(w => w.trim().length > 0);
  const totalWords = wordList.length;

  // Calculate WPM (words per minute)
  const wpm = speakingTime > 0 ? (totalWords / speakingTime) * 60 : 0;

  // Detect filler words
  const { fillerWordCount, fillerWords } = detectFillerWords(wordList);
  const fillerWordRate = totalWords > 0 ? (fillerWordCount / totalWords) * 100 : 0;

  // Calculate confidence score
  const confidence = calculateConfidenceScore({
    wpm,
    fillerWordRate,
    silenceStats,
    words,
  });

  return {
    wpm: Math.round(wpm),
    totalWords,
    fillerWordCount,
    fillerWordRate: Math.round(fillerWordRate * 10) / 10,
    fillerWords,
    silenceStats,
    speakingTime: Math.round(speakingTime * 10) / 10,
    totalDuration: Math.round(duration * 10) / 10,
    confidence,
  };
}

/**
 * Detect and count Korean filler words
 */
function detectFillerWords(words: string[]): {
  fillerWordCount: number;
  fillerWords: FillerWordStats[];
} {
  const fillerCounts = new Map<string, number>();

  for (const word of words) {
    const normalized = word.trim().toLowerCase();

    // Check if it's a filler word
    if (KOREAN_FILLER_WORDS[normalized]) {
      fillerCounts.set(normalized, (fillerCounts.get(normalized) || 0) + 1);
    }
  }

  const fillerWords: FillerWordStats[] = Array.from(fillerCounts.entries()).map(([word, count]) => ({
    word,
    count,
    category: KOREAN_FILLER_WORDS[word],
  }));

  fillerWords.sort((a, b) => b.count - a.count);

  const fillerWordCount = fillerWords.reduce((sum, f) => sum + f.count, 0);

  return { fillerWordCount, fillerWords };
}

/**
 * Calculate silence statistics from word timings
 */
function calculateSilenceStats(
  words: TranscriptionWord[],
  totalDuration: number
): SilenceStats {
  if (words.length === 0) {
    return {
      totalSilenceTime: 0,
      silenceCount: 0,
      avgSilenceLength: 0,
      longPauses: 0,
      silenceRate: 0,
    };
  }

  const silences: number[] = [];
  let totalSilenceTime = 0;
  let longPauses = 0;

  // Calculate gaps between words
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currentWord = words[i];

    const gap = currentWord.start - prevWord.end;

    if (gap > 0.1) { // Count as silence if gap > 100ms
      silences.push(gap);
      totalSilenceTime += gap;

      if (gap > 2.0) { // Long pause threshold: 2 seconds
        longPauses++;
      }
    }
  }

  // Add initial silence (if speech doesn't start at 0)
  if (words[0].start > 0.1) {
    const initialSilence = words[0].start;
    silences.push(initialSilence);
    totalSilenceTime += initialSilence;
  }

  // Add final silence (if speech ends before audio duration)
  const lastWordEnd = words[words.length - 1].end;
  if (totalDuration > lastWordEnd + 0.1) {
    const finalSilence = totalDuration - lastWordEnd;
    silences.push(finalSilence);
    totalSilenceTime += finalSilence;
  }

  const silenceCount = silences.length;
  const avgSilenceLength = silenceCount > 0 ? totalSilenceTime / silenceCount : 0;
  const silenceRate = totalDuration > 0 ? (totalSilenceTime / totalDuration) * 100 : 0;

  return {
    totalSilenceTime: Math.round(totalSilenceTime * 10) / 10,
    silenceCount,
    avgSilenceLength: Math.round(avgSilenceLength * 100) / 100,
    longPauses,
    silenceRate: Math.round(silenceRate * 10) / 10,
  };
}

/**
 * Calculate confidence score based on speech patterns
 */
function calculateConfidenceScore(params: {
  wpm: number;
  fillerWordRate: number;
  silenceStats: SilenceStats;
  words: TranscriptionWord[];
}): VoiceConfidenceScore {
  const { wpm, fillerWordRate, silenceStats, words } = params;

  // 1. Speech Pace Score (optimal: 120-180 WPM for Korean)
  let speechPaceScore = 0;
  if (wpm >= 120 && wpm <= 180) {
    speechPaceScore = 100; // Optimal range
  } else if (wpm >= 100 && wpm < 120) {
    speechPaceScore = 70 + ((wpm - 100) / 20) * 30; // Slightly slow
  } else if (wpm > 180 && wpm <= 220) {
    speechPaceScore = 70 + ((220 - wpm) / 40) * 30; // Slightly fast
  } else if (wpm < 100) {
    speechPaceScore = Math.max(0, (wpm / 100) * 70); // Too slow
  } else {
    speechPaceScore = Math.max(0, 70 - ((wpm - 220) / 50) * 70); // Too fast
  }

  // 2. Fluency Score (low filler words = high fluency)
  let fluencyScore = 0;
  if (fillerWordRate < 2) {
    fluencyScore = 100; // Excellent
  } else if (fillerWordRate < 5) {
    fluencyScore = 80 + ((5 - fillerWordRate) / 3) * 20; // Good
  } else if (fillerWordRate < 10) {
    fluencyScore = 60 + ((10 - fillerWordRate) / 5) * 20; // Average
  } else {
    fluencyScore = Math.max(0, 60 - ((fillerWordRate - 10) / 10) * 60); // Poor
  }

  // 3. Articulation Score (consistent pace, not too many long pauses)
  let articulationScore = 100;

  // Penalize for long pauses
  articulationScore -= Math.min(40, silenceStats.longPauses * 10);

  // Penalize for high silence rate
  if (silenceStats.silenceRate > 30) {
    articulationScore -= (silenceStats.silenceRate - 30) * 2;
  }

  // Bonus for consistent word timing (low variance)
  if (words.length > 5) {
    const wordDurations = words.map(w => w.end - w.start);
    const avgDuration = wordDurations.reduce((a, b) => a + b, 0) / wordDurations.length;
    const variance = wordDurations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / wordDurations.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.2) {
      articulationScore += 10; // Bonus for consistent articulation
    }
  }

  articulationScore = Math.max(0, Math.min(100, articulationScore));

  // Overall score: weighted average
  const overall = Math.round(
    speechPaceScore * 0.3 +
    fluencyScore * 0.4 +
    articulationScore * 0.3
  );

  return {
    overall,
    factors: {
      speechPace: Math.round(speechPaceScore),
      fluency: Math.round(fluencyScore),
      articulation: Math.round(articulationScore),
    },
  };
}

/**
 * Generate feedback based on voice analysis
 */
export function generateVoiceFeedback(analysis: VoiceAnalysisResult): string[] {
  const feedback: string[] = [];

  // WPM feedback
  if (analysis.wpm < 100) {
    feedback.push('말하는 속도가 다소 느립니다. 조금 더 자신감 있게 말해보세요.');
  } else if (analysis.wpm > 200) {
    feedback.push('말하는 속도가 빠릅니다. 천천히 또박또박 말하면 더 좋습니다.');
  } else if (analysis.wpm >= 120 && analysis.wpm <= 180) {
    feedback.push('적절한 말하기 속도를 유지하고 있습니다.');
  }

  // Filler words feedback
  if (analysis.fillerWordRate > 10) {
    feedback.push(`불필요한 추임새가 많습니다 (${analysis.fillerWordRate.toFixed(1)}%). "음", "어", "그" 등의 표현을 줄여보세요.`);
  } else if (analysis.fillerWordRate < 3) {
    feedback.push('매끄럽고 유창한 답변입니다.');
  }

  // Silence feedback
  if (analysis.silenceStats.longPauses > 2) {
    feedback.push(`긴 침묵이 ${analysis.silenceStats.longPauses}회 있었습니다. 답변 전에 미리 생각을 정리하면 좋습니다.`);
  }

  // Overall confidence
  if (analysis.confidence.overall >= 80) {
    feedback.push('전반적으로 자신감 있는 답변입니다.');
  } else if (analysis.confidence.overall < 50) {
    feedback.push('긴장한 느낌이 전달됩니다. 심호흡하고 천천히 답변해보세요.');
  }

  return feedback;
}

/**
 * Analyze multiple interview answers for trends
 */
export interface VoiceTrendAnalysis {
  avgWpm: number;
  avgFillerRate: number;
  avgConfidence: number;
  improvement: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export function analyzeVoiceTrends(analyses: VoiceAnalysisResult[]): VoiceTrendAnalysis {
  if (analyses.length === 0) {
    return {
      avgWpm: 0,
      avgFillerRate: 0,
      avgConfidence: 0,
      improvement: 'stable',
      recommendations: [],
    };
  }

  const avgWpm = analyses.reduce((sum, a) => sum + a.wpm, 0) / analyses.length;
  const avgFillerRate = analyses.reduce((sum, a) => sum + a.fillerWordRate, 0) / analyses.length;
  const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence.overall, 0) / analyses.length;

  // Check improvement trend (compare first half vs second half)
  let improvement: 'improving' | 'stable' | 'declining' = 'stable';

  if (analyses.length >= 4) {
    const midpoint = Math.floor(analyses.length / 2);
    const firstHalf = analyses.slice(0, midpoint);
    const secondHalf = analyses.slice(midpoint);

    const firstAvgConfidence = firstHalf.reduce((sum, a) => sum + a.confidence.overall, 0) / firstHalf.length;
    const secondAvgConfidence = secondHalf.reduce((sum, a) => sum + a.confidence.overall, 0) / secondHalf.length;

    const confidenceDiff = secondAvgConfidence - firstAvgConfidence;

    if (confidenceDiff > 10) {
      improvement = 'improving';
    } else if (confidenceDiff < -10) {
      improvement = 'declining';
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (avgWpm < 110) {
    recommendations.push('전반적으로 말하는 속도를 조금 올려보세요.');
  } else if (avgWpm > 190) {
    recommendations.push('말하는 속도를 조금 늦춰 여유있게 답변해보세요.');
  }

  if (avgFillerRate > 8) {
    recommendations.push('추임새 사용을 줄이기 위해 답변 전 1-2초 생각하는 습관을 들이세요.');
  }

  if (improvement === 'declining') {
    recommendations.push('후반부로 갈수록 긴장도가 높아지고 있습니다. 중간에 심호흡으로 긴장을 풀어보세요.');
  }

  return {
    avgWpm: Math.round(avgWpm),
    avgFillerRate: Math.round(avgFillerRate * 10) / 10,
    avgConfidence: Math.round(avgConfidence),
    improvement,
    recommendations,
  };
}
