// ============================================
// STT Service with Deepgram Primary + Whisper Fallback
// ============================================

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type STTProvider = 'deepgram' | 'whisper';

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  provider: STTProvider;
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
  profanityFilter?: boolean;
}

class STTService {
  private deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  private primaryProvider: STTProvider = 'deepgram';
  private fallbackProvider: STTProvider = 'whisper';

  async transcribe(audioBuffer: Buffer, config: STTConfig = {}): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const language = config.language || 'ko';

    // Try Deepgram first
    if (this.deepgramApiKey) {
      try {
        const result = await this.transcribeWithDeepgram(audioBuffer, language);
        return {
          ...result,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        console.error('Deepgram transcription failed, falling back to Whisper:', error);
      }
    }

    // Fallback to Whisper
    try {
      const result = await this.transcribeWithWhisper(audioBuffer, language);
      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Whisper transcription also failed:', error);
      throw new Error('All STT providers failed');
    }
  }

  private async transcribeWithDeepgram(audioBuffer: Buffer, language: string): Promise<Omit<TranscriptionResult, 'durationMs'>> {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.deepgramApiKey}`,
        'Content-Type': 'audio/wav',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();
    const transcript = data.results?.channels?.[0]?.alternatives?.[0];

    return {
      text: transcript?.transcript || '',
      confidence: transcript?.confidence,
      provider: 'deepgram',
      words: transcript?.words?.map((w: { word: string; start: number; end: number; confidence: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    };
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
        confidence: 1, // Whisper doesn't provide confidence per word
      })),
    };
  }

  // Real-time streaming transcription (for future use)
  async createStreamingSession(language: string = 'ko'): Promise<WebSocket | null> {
    if (!this.deepgramApiKey) {
      console.warn('Deepgram API key not available for streaming');
      return null;
    }

    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?language=${language}&punctuate=true`,
      ['token', this.deepgramApiKey]
    );

    return ws;
  }
}

// Singleton instance
export const sttService = new STTService();

// Utility function
export async function transcribeAudio(audioBuffer: Buffer, language: string = 'ko'): Promise<TranscriptionResult> {
  return sttService.transcribe(audioBuffer, { language });
}
