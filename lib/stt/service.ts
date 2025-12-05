// ============================================
// STT Service - OpenAI Whisper
// ============================================

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  provider: 'whisper';
  durationMs: number;
  words?: TranscriptionWord[];
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface STTConfig {
  language?: string;
  punctuate?: boolean;
}

class STTService {
  async transcribe(audioBuffer: Buffer, config: STTConfig = {}): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const language = config.language || 'ko';

    try {
      const result = await this.transcribeWithWhisper(audioBuffer, language);
      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      throw new Error('STT transcription failed');
    }
  }

  private async transcribeWithWhisper(audioBuffer: Buffer, language: string): Promise<Omit<TranscriptionResult, 'durationMs'>> {
    const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language,
      response_format: 'verbose_json',
    });

    return {
      text: transcription.text,
      provider: 'whisper',
      words: transcription.words?.map(w => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: 1,
      })),
    };
  }
}

// Singleton instance
export const sttService = new STTService();

// Utility function
export async function transcribeAudio(audioBuffer: Buffer, language: string = 'ko'): Promise<TranscriptionResult> {
  return sttService.transcribe(audioBuffer, { language });
}
