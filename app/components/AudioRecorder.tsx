"use client";

import { useState, useRef } from "react";

// ============================================
// 📌 AudioRecorder Component
// ============================================
// - 음성 녹음 버튼 제공
// - MediaRecorder API로 브라우저에서 오디오 녹음
// - 녹음 완료 시 /api/transcribe로 전송
// - 변환된 텍스트 화면에 표시

interface TranscriptionResponse {
  success: boolean;
  text: string;
  fileName: string;
  timestamp: string;
  error?: string;
  details?: string;
}

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 녹음 시작
  const startRecording = async () => {
    try {
      setError("");
      setTranscription("");

      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaRecorder 생성
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 오디오 데이터 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 녹음 완료 처리
      mediaRecorder.onstop = async () => {
        // 오디오 Blob 생성
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        // 트랜스크립션 API 호출
        await transcribeAudio(audioBlob);

        // 스트림 정리
        stream.getTracks().forEach((track) => track.stop());
      };

      // 녹음 시작
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setError(err instanceof Error ? err.message : "마이크 접근 권한이 필요합니다.");
    }
  };

  // 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 오디오 → 텍스트 변환 API 호출
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError("");

      // FormData 생성
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      // API 호출
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data: TranscriptionResponse = await response.json();

      if (data.success) {
        setTranscription(data.text);
      } else {
        setError(data.error || "변환 실패");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="audio-recorder">
      <div className="controls">
        {!isRecording ? (
          <button onClick={startRecording} disabled={isProcessing} className="btn-start">
            🎤 녹음 시작
          </button>
        ) : (
          <button onClick={stopRecording} className="btn-stop">
            ⏹️ 녹음 중지
          </button>
        )}
      </div>

      {/* 녹음 상태 표시 */}
      {isRecording && (
        <div className="recording-indicator">
          <span className="pulse"></span>
          녹음 중...
        </div>
      )}

      {/* 처리 중 표시 */}
      {isProcessing && (
        <div className="processing">
          <div className="spinner"></div>
          음성을 텍스트로 변환하는 중...
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="error">
          <strong>오류:</strong> {error}
        </div>
      )}

      {/* 변환된 텍스트 */}
      {transcription && (
        <div className="transcription-result">
          <h3>📝 변환된 텍스트</h3>
          <p>{transcription}</p>
        </div>
      )}

      <style jsx>{`
        .audio-recorder {
          max-width: 600px;
          margin: 2rem auto;
          padding: 2rem;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          background: #fafafa;
        }

        .controls {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .btn-start,
        .btn-stop {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-start {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-start:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-start:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-stop {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          animation: pulse-button 1.5s infinite;
        }

        @keyframes pulse-button {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(245, 87, 108, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(245, 87, 108, 0);
          }
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #fee;
          border-radius: 8px;
          color: #c33;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .pulse {
          width: 12px;
          height: 12px;
          background: #f00;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .processing {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #e3f2fd;
          border-radius: 8px;
          color: #1976d2;
          font-weight: 500;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #1976d2;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          padding: 1rem;
          background: #ffebee;
          border-left: 4px solid #f44336;
          border-radius: 4px;
          color: #c62828;
          margin-bottom: 1rem;
        }

        .transcription-result {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .transcription-result h3 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1.2rem;
        }

        .transcription-result p {
          margin: 0;
          line-height: 1.6;
          color: #555;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}
