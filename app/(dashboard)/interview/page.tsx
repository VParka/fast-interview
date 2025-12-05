"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Phone,
  Volume2,
  VolumeX,
  User,
  Pause,
  Play,
  Keyboard,
  MessageCircle,
  Clock,
  Send,
} from "lucide-react";
import { INTERVIEWERS, type InterviewerType } from "@/types/interview";

// Interviewer array for UI
const interviewersList = Object.values(INTERVIEWERS);

interface Message {
  id: string;
  role: "user" | "interviewer";
  content: string;
  interviewerId?: InterviewerType;
  innerThought?: string;
  timestamp: Date;
  scoreChange?: number; // 이 메시지로 인한 점수 변화
}

// Status messages
const STATUS_MESSAGES = {
  listening: "듣고 있어요...",
  processing: "생각 중...",
  speaking: "답변 중...",
  waiting: "답변을 기다리고 있어요",
};

export default function InterviewPage() {
  const router = useRouter();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns] = useState(10);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // UI state
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInterviewerId, setCurrentInterviewerId] = useState<InterviewerType>("hiring_manager");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const [showInnerThoughts, setShowInnerThoughts] = useState(false);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [timerWarning, setTimerWarning] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentInterviewer = INTERVIEWERS[currentInterviewerId];

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer countdown
  useEffect(() => {
    if (timerActive && timeRemaining > 0 && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;
          if (newTime <= 30) setTimerWarning(true);
          if (newTime <= 0) {
            // Auto submit on timeout
            if (isRecording) stopRecording();
            setTimerActive(false);
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerActive, isPaused, isRecording]);

  // Load session from sessionStorage on mount
  useEffect(() => {
    const storedSession = sessionStorage.getItem("interviewSession");
    const storedFirstMessage = sessionStorage.getItem("firstMessage");

    if (storedSession && storedFirstMessage) {
      const session = JSON.parse(storedSession);
      const firstMessage = JSON.parse(storedFirstMessage);

      setSessionId(session.id);
      setIsInterviewStarted(true);
      setMessages([
        {
          id: firstMessage.id,
          role: "interviewer",
          content: firstMessage.content,
          interviewerId: firstMessage.interviewer_id,
          timestamp: new Date(firstMessage.timestamp),
        },
      ]);

      // Clear sessionStorage
      sessionStorage.removeItem("interviewSession");
      sessionStorage.removeItem("firstMessage");

      // Start timer for first response
      setTimeRemaining(120);
      setTimerActive(true);
      setTimerWarning(false);
    }
  }, []);

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = async () => {
    try {
      setError("");
      setStatusMessage(STATUS_MESSAGES.listening);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      updateAudioLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await processUserResponse(audioBlob);
        stream.getTracks().forEach((track) => track.stop());

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAudioLevel(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimerActive(true);
    } catch (err) {
      console.error("Recording error:", err);
      setError(err instanceof Error ? err.message : "마이크 접근 권한이 필요합니다.");
      setStatusMessage("");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setTimerActive(false);
    }
  };

  const processUserResponse = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setStatusMessage(STATUS_MESSAGES.processing);
      setError("");

      // 1. STT - Convert speech to text
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      const sttResponse = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      const sttData = await sttResponse.json();

      if (!sttData.success) {
        setError(sttData.error || "음성 변환 실패");
        setInputMode("text"); // Switch to text mode on STT failure
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: sttData.text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // 2. Get interviewer response
      await getInterviewerResponse(sttData.text);
    } catch (err) {
      console.error("Processing error:", err);
      setError("서버와 통신 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const getInterviewerResponse = async (userText: string) => {
    if (!sessionId) return;

    setStatusMessage(STATUS_MESSAGES.speaking);

    try {
      const response = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          content: userText,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "면접관 응답 생성 실패");
        return;
      }

      // Add interviewer message
      const aiMessage: Message = {
        id: data.interviewer_response.id,
        role: "interviewer",
        content: data.interviewer_response.content,
        interviewerId: data.interviewer.id,
        innerThought: data.interviewer_response.structured_response?.inner_thought,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Update state
      setCurrentInterviewerId(data.interviewer.id);
      setTurnCount(data.turn_count);

      // Play TTS if not muted
      if (!isMuted) {
        await playTTS(data.interviewer_response.content, data.interviewer.id);
      }

      // Check if interview should end
      if (data.should_end) {
        await endInterview();
      } else {
        // Reset timer for next answer
        setTimeRemaining(120);
        setTimerActive(true);
        setTimerWarning(false);
      }
    } catch (err) {
      console.error("Interviewer response error:", err);
      setError("면접관 응답을 가져오는 중 오류가 발생했습니다.");
    }
  };

  const playTTS = async (text: string, interviewerId: string) => {
    try {
      setIsSpeaking(true);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, interviewerId }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
        };
        await audio.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textInput.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTextInput("");

    await getInterviewerResponse(textInput.trim());
  };

  const startInterview = async () => {
    setIsInterviewStarted(true);
    setIsProcessing(true);
    setStatusMessage(STATUS_MESSAGES.processing);

    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: "frontend",
          difficulty: "medium",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.session.id);

        const welcomeMessage: Message = {
          id: data.first_message.id,
          role: "interviewer",
          content: data.first_message.content,
          interviewerId: data.first_message.interviewer_id,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);

        if (!isMuted) {
          await playTTS(data.first_message.content, data.first_message.interviewer_id);
        }

        // Start timer
        setTimeRemaining(120);
        setTimerActive(true);
      } else {
        setError(data.error || "면접 시작 실패");
      }
    } catch (err) {
      console.error("Start interview error:", err);
      setError("면접 시작 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const endInterview = async () => {
    if (!sessionId) return;

    setIsProcessing(true);
    setStatusMessage("면접 결과를 분석 중...");

    try {
      const response = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        // Store result and navigate
        sessionStorage.setItem("interviewResult", JSON.stringify(data.result));
        router.push(`/dashboard/${data.result.id}`);
      } else {
        setError(data.error || "결과 생성 실패");
      }
    } catch (err) {
      console.error("End interview error:", err);
      setError("면접 종료 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      setTimerActive(false);
    } else {
      setTimerActive(true);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Timer progress percentage
  const timerProgress = (timeRemaining / 120) * 100;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/50">
        <div className="flex items-center gap-4">
          {interviewersList.map((interviewer) => (
            <motion.div
              key={interviewer.id}
              animate={{
                scale: currentInterviewerId === interviewer.id ? 1.05 : 1,
                opacity: currentInterviewerId === interviewer.id ? 1 : 0.6,
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                currentInterviewerId === interviewer.id
                  ? "bg-mint/10 ring-2 ring-mint"
                  : "bg-secondary/30"
              }`}
            >
              <span className="text-xl">{interviewer.emoji}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{interviewer.name}</p>
                <p className="text-xs text-muted-foreground">{interviewer.role}</p>
              </div>
              {currentInterviewerId === interviewer.id && (isProcessing || isSpeaking) && (
                <div className="voice-wave ml-2">
                  {[...Array(3)].map((_, i) => (
                    <span key={i} style={{ height: `${8 + i * 4}px` }} />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Turn counter */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {turnCount}/{maxTurns}
            </span>
          </div>

          {/* Timer */}
          {isInterviewStarted && timerActive && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                timerWarning ? "bg-destructive/20 text-destructive" : "bg-secondary/50"
              }`}
            >
              <Clock className={`w-4 h-4 ${timerWarning ? "animate-pulse" : ""}`} />
              <span className="text-sm font-medium tabular-nums">{formatTime(timeRemaining)}</span>
            </div>
          )}

          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          {isInterviewStarted && (
            <>
              <Button variant="ghost" size="icon" onClick={togglePause}>
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              <Button variant="destructive" onClick={endInterview} className="gap-2">
                <Phone className="w-4 h-4" />
                면접 종료
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <Pause className="w-16 h-16 text-mint mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">면접 일시정지</h2>
              <p className="text-muted-foreground mb-6">준비가 되면 재개 버튼을 누르세요</p>
              <Button variant="mint" size="lg" onClick={togglePause} className="gap-2">
                <Play className="w-5 h-5" />
                면접 재개
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!isInterviewStarted ? (
          // Start Screen
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-lg"
            >
              <div className="flex justify-center gap-4 mb-8">
                {interviewersList.map((interviewer, index) => (
                  <motion.div
                    key={interviewer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-mint/20 to-soft-blue/20 flex items-center justify-center text-4xl"
                  >
                    {interviewer.emoji}
                  </motion.div>
                ))}
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-4">
                AI 면접을 시작할 준비가 되셨나요?
              </h1>
              <p className="text-muted-foreground mb-8">
                3인의 AI 면접관이 실시간으로 질문합니다.
                <br />
                마이크를 허용하고 면접을 시작해주세요.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => router.push("/interview/setup")} className="gap-2">
                  설정 변경
                </Button>
                <Button variant="mint" size="xl" onClick={startInterview} className="gap-2">
                  <Mic className="w-5 h-5" />
                  면접 시작하기
                </Button>
              </div>
            </motion.div>
          </div>
        ) : isInterviewEnded ? (
          // Results Screen
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-2xl p-12 rounded-3xl bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border/50"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-mint/20 to-soft-blue/20 flex items-center justify-center text-6xl"
                >
                  {score >= 60 ? '🎉' : '😊'}
                </motion.div>
                <h1 className="font-display text-4xl font-bold text-foreground mb-4">
                  면접이 종료되었습니다
                </h1>
                <p className="text-muted-foreground mb-8">
                  총 {roundCount}라운드의 면접을 완료하셨습니다.
                </p>
              </div>

              <div className="mb-8 p-8 rounded-2xl bg-background/50">
                <p className="text-sm text-muted-foreground mb-3">최종 호감도 점수</p>
                <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden mb-4">
                  <motion.div
                    className={`absolute top-0 left-0 h-full ${
                      score >= 60 ? 'bg-mint' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className={`text-6xl font-bold mb-4 ${
                    score >= 60 ? 'text-mint' : score >= 40 ? 'text-yellow-500' : 'text-red-500'
                  }`}
                >
                  {score}점
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className={`inline-block px-8 py-4 rounded-xl text-2xl font-bold ${
                    score >= 60
                      ? 'bg-mint/20 text-mint border-2 border-mint'
                      : 'bg-red-500/20 text-red-500 border-2 border-red-500'
                  }`}
                >
                  {score >= 60 ? '✅ 합격' : '❌ 불합격'}
                </motion.div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {score >= 60
                    ? '축하합니다! 면접관들에게 좋은 인상을 남기셨습니다.'
                    : '아쉽지만 이번에는 기회가 되지 못했습니다. 다시 도전해보세요!'}
                </p>
                <div className="flex gap-4 justify-center">
                  <Button variant="mint" size="lg" onClick={restartInterview} className="gap-2">
                    다시 면접 보기
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => window.location.href = '/dashboard'} className="gap-2">
                    대시보드로 이동
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          // Interview Screen
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => {
                const msgInterviewer = message.interviewerId
                  ? INTERVIEWERS[message.interviewerId]
                  : null;

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "interviewer" && msgInterviewer && (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint/20 to-soft-blue/20 flex items-center justify-center text-xl shrink-0">
                        {msgInterviewer.emoji}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-2xl">
                      <div
                        className={`p-4 rounded-2xl ${
                          message.role === "user"
                            ? "bg-mint text-navy"
                            : "bg-secondary/50"
                        }`}
                      >
                        {message.role === "interviewer" && msgInterviewer && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {msgInterviewer.name} ({msgInterviewer.role})
                          </p>
                        )}
                        <p className={message.role === "user" ? "text-navy" : "text-foreground"}>
                          {message.content}
                        </p>
                      </div>

                      {/* Inner thought bubble */}
                      {showInnerThoughts && message.innerThought && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20"
                        >
                          <p className="text-xs text-violet-400 italic">
                            💭 {message.innerThought}
                          </p>
                        </motion.div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-10 h-10 rounded-xl bg-mint/20 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-mint" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Processing indicator */}
              {isProcessing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint/20 to-soft-blue/20 flex items-center justify-center text-xl">
                    {currentInterviewer.emoji}
                  </div>
                  <div className="bg-secondary/50 px-4 py-3 rounded-2xl">
                    <p className="text-xs text-muted-foreground mb-2">{statusMessage}</p>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 bg-mint rounded-full"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Controls */}
            <div className="p-6 border-t border-border/50">
              {/* Timer Progress Bar */}
              {timerActive && (
                <div className="mb-4">
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${timerWarning ? "bg-destructive" : "bg-mint"}`}
                      initial={{ width: "100%" }}
                      animate={{ width: `${timerProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Input Mode Toggle */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
                  <button
                    onClick={() => setInputMode("voice")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                      inputMode === "voice"
                        ? "bg-mint text-navy"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    음성
                  </button>
                  <button
                    onClick={() => setInputMode("text")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                      inputMode === "text"
                        ? "bg-mint text-navy"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Keyboard className="w-4 h-4" />
                    텍스트
                  </button>
                </div>
              </div>

              {inputMode === "voice" ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Audio level visualization */}
                  {isRecording && (
                    <div className="flex items-center gap-1 h-8">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-mint rounded-full"
                          animate={{
                            height: audioLevel > i * 5 ? `${8 + Math.random() * 16}px` : "4px",
                          }}
                          transition={{ duration: 0.1 }}
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    variant={isRecording ? "destructive" : "mint"}
                    size="xl"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing || isSpeaking}
                    className="w-48 gap-2"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        녹음 중지
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        답변하기
                      </>
                    )}
                  </Button>

                  {isRecording && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-mint"
                    >
                      🔴 녹음 중... 말씀을 마치시면 버튼을 눌러주세요.
                    </motion.p>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                    placeholder="답변을 입력하세요..."
                    disabled={isProcessing}
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-mint focus:ring-1 focus:ring-mint outline-none transition-all"
                  />
                  <Button
                    variant="mint"
                    size="lg"
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || isProcessing}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    전송
                  </Button>
                </div>
              )}

              {/* Inner thoughts toggle */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowInnerThoughts(!showInnerThoughts)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    showInnerThoughts
                      ? "bg-violet-500/20 text-violet-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  💭 면접관 속마음 {showInnerThoughts ? "숨기기" : "보기"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
