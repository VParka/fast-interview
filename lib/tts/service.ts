// ============================================
// TTS Service with OpenAI Primary + ElevenLabs Fallback
// ============================================

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type TTSProvider = 'openai' | 'elevenlabs';
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface SynthesisResult {
  audioBuffer: Buffer;
  contentType: string;
  provider: TTSProvider;
  durationMs: number;
}

export interface TTSConfig {
  voice?: string;
  speed?: number;
  model?: string;
}

// Voice mapping for interviewers
export const INTERVIEWER_VOICES: Record<string, { openai: OpenAIVoice; elevenlabs: string }> = {
  hiring_manager: { openai: 'onyx', elevenlabs: 'pNInz6obpgDQGcFmaJgB' }, // Male, professional
  hr_manager: { openai: 'nova', elevenlabs: 'EXAVITQu4vr4xnSDxMaL' }, // Female, warm
  senior_peer: { openai: 'echo', elevenlabs: 'yoZ06aMxZJJ28mfd3POQ' }, // Male, friendly
};

class TTSService {
  private elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  private primaryProvider: TTSProvider = 'openai';
  private fallbackProvider: TTSProvider = 'elevenlabs';

  async synthesize(text: string, interviewerId?: string, config: TTSConfig = {}): Promise<SynthesisResult> {
    const startTime = Date.now();

    // Get voice for interviewer
    const voices = interviewerId ? INTERVIEWER_VOICES[interviewerId] : null;
    const openaiVoice = (config.voice as OpenAIVoice) || voices?.openai || 'alloy';

    // Try OpenAI first
    try {
      const result = await this.synthesizeWithOpenAI(text, openaiVoice, config.speed);
      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('OpenAI TTS failed, falling back to ElevenLabs:', error);
    }

    // Fallback to ElevenLabs
    if (this.elevenLabsApiKey) {
      try {
        const elevenLabsVoice = voices?.elevenlabs || 'pNInz6obpgDQGcFmaJgB';
        const result = await this.synthesizeWithElevenLabs(text, elevenLabsVoice);
        return {
          ...result,
          durationMs: Date.now() - startTime,
        };
      } catch (fallbackError) {
        console.error('ElevenLabs TTS also failed:', fallbackError);
        throw new Error('All TTS providers failed');
      }
    }

    throw new Error('No TTS provider available');
  }

  private async synthesizeWithOpenAI(text: string, voice: OpenAIVoice, speed: number = 1.0): Promise<Omit<SynthesisResult, 'durationMs'>> {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice,
      input: text,
      speed: Math.max(0.25, Math.min(4.0, speed)),
      response_format: 'mp3',
    });

    const arrayBuffer = await mp3.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer: buffer,
      contentType: 'audio/mpeg',
      provider: 'openai',
    };
  }

  private async synthesizeWithElevenLabs(text: string, voiceId: string): Promise<Omit<SynthesisResult, 'durationMs'>> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey!,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer: buffer,
      contentType: 'audio/mpeg',
      provider: 'elevenlabs',
    };
  }

  // Streaming synthesis (for lower latency)
  async synthesizeStream(text: string, voice: OpenAIVoice = 'alloy'): Promise<ReadableStream> {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: 'mp3',
    });

    // Convert Response to ReadableStream
    return response.body as unknown as ReadableStream;
  }
}

// Singleton instance
export const ttsService = new TTSService();

// Utility function
export async function synthesizeSpeech(
  text: string,
  interviewerId?: string,
  config: TTSConfig = {}
): Promise<SynthesisResult> {
  return ttsService.synthesize(text, interviewerId, config);
}
