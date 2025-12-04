import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// ============================================
// 📌 STT API - Speech-to-Text Transcription
// ============================================
// POST /api/transcribe
// - 음성 파일을 받아서 OpenAI Whisper API로 텍스트 변환
// - 변환된 텍스트를 txt 파일로 저장
// - 결과를 JSON으로 반환
//
// 테스트 모드: .env.local에 TEST_MODE=true 추가 시
// OpenAI API 호출 없이 모의(mock) 응답 반환

// TEST_MODE가 활성화되지 않은 경우에만 OpenAI 클라이언트 초기화
const TEST_MODE = process.env.TEST_MODE === 'true';
const openai = TEST_MODE
  ? null
  : new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });

export async function POST(request: NextRequest) {
  try {
    // 1. FormData에서 오디오 파일 가져오기
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 없습니다.' },
        { status: 400 }
      );
    }

    // 2. File 객체를 Buffer로 변환
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. 임시 파일로 저장 (OpenAI API는 파일 경로 필요)
    const tempDir = path.join(process.cwd(), 'transcriptions');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `temp_${Date.now()}.wav`);
    fs.writeFileSync(tempFilePath, buffer);

    let transcriptionText: string;

    // 4. OpenAI Whisper API로 음성→텍스트 변환 (또는 테스트 모드)
    if (TEST_MODE) {
      // 테스트 모드: 모의 응답 반환
      console.log('🧪 TEST_MODE: OpenAI API 호출 건너뛰기');
      transcriptionText = '[테스트 모드] 이것은 모의 음성 변환 텍스트입니다. 실제 OpenAI API를 사용하려면 TEST_MODE를 false로 설정하고 유효한 API 키와 크레딧을 확인하세요.';
      
      // 임시 파일 삭제
      fs.unlinkSync(tempFilePath);
    } else {
      // 실제 OpenAI API 호출
      if (!openai) {
        throw new Error('OpenAI client is not initialized');
      }
      
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(tempFilePath),
      });

      // 임시 파일 삭제
      fs.unlinkSync(tempFilePath);
      
      transcriptionText = transcription.text;
    }

    // 6. 변환된 텍스트를 txt 파일로 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const txtFileName = `transcription_${timestamp}.txt`;
    const txtFilePath = path.join(tempDir, txtFileName);

    fs.writeFileSync(txtFilePath, transcriptionText, 'utf-8');

    // 7. 결과 반환
    return NextResponse.json({
      success: true,
      text: transcriptionText,
      filePath: txtFilePath,
      fileName: txtFileName,
      timestamp: new Date().toISOString(),
      testMode: TEST_MODE, // 테스트 모드 여부 표시
    });
  } catch (error) {
    console.error('Transcription error:', error);

    return NextResponse.json(
      {
        error: '음성 변환 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
