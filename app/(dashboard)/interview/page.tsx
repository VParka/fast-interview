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
import { INTERVIEWER_BASE, type InterviewerType, type SessionInterviewerNames } from "@/types/interview";
import { GuidancePanel } from "@/components/interview/GuidancePanel";
import { InterviewerAvatar } from "@/components/interview/InterviewerAvatar";
import { VoiceVisualizer } from "@/components/interview/VoiceVisualizer";
import { PageTransition } from "@/components/ui/PageTransition";

// Interviewer types for UI
const interviewerTypes: InterviewerType[] = ['hiring_manager', 'hr_manager', 'senior_peer'];

interface Message {
  id: string;
  role: "user" | "interviewer";
  content: string;
  interviewerId?: InterviewerType;
  innerThought?: string;
  timestamp: Date;
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
  const [textInput, setTextInput] = useState("");
  const [showInnerThoughts, setShowInnerThoughts] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  // UI state
  const [showGuidance, setShowGuidance] = useState(true);
  const [guidanceTimerStarted, setGuidanceTimerStarted] = useState(false);

  // Interviewer names from DB (random per session)
  const [interviewerNames, setInterviewerNames] = useState<SessionInterviewerNames>({
    hiring_manager: '실무팀장',
    hr_manager: 'HR 담당자',
    senior_peer: '시니어 동료',
  });

  // Timer state - 5 minutes (300 seconds) total interview time
  const INTERVIEW_TIME_LIMIT = 300; // 5 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INTERVIEW_TIME_LIMIT);
  const [timerWarning, setTimerWarning] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const guidanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentInterviewer = INTERVIEWER_BASE[currentInterviewerId];

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer countdown - 5 minute total interview time
  useEffect(() => {
    if (timerActive && timeRemaining > 0 && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;
          if (newTime <= 60) setTimerWarning(true); // Warning at 1 minute left
          if (newTime <= 0) {
            // Auto end interview when time runs out
            if (isRecording) stopRecording();
            setTimerActive(false);
            // Automatically end interview and save results
            endInterview();
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

  // Auto-hide guidance after 10 seconds when interview starts
  useEffect(() => {
    if (isInterviewStarted && showGuidance && !guidanceTimerStarted) {
      setGuidanceTimerStarted(true);
      guidanceTimerRef.current = setTimeout(() => {
        setShowGuidance(false);
      }, 10000); // 10 seconds
    }

    return () => {
      if (guidanceTimerRef.current) {
        clearTimeout(guidanceTimerRef.current);
      }
    };
  }, [isInterviewStarted, showGuidance, guidanceTimerStarted]);

  // Load session from sessionStorage on mount
  useEffect(() => {
    const storedSession = sessionStorage.getItem("interviewSession");
    const storedFirstMessage = sessionStorage.getItem("firstMessage");
    const storedInterviewerNames = sessionStorage.getItem("interviewerNames");

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

      // Load interviewer names if stored
      if (storedInterviewerNames) {
        setInterviewerNames(JSON.parse(storedInterviewerNames));
        sessionStorage.removeItem("interviewerNames");
      }

      // Clear sessionStorage
      sessionStorage.removeItem("interviewSession");
      sessionStorage.removeItem("firstMessage");

      // Start 5-minute countdown timer
      setTimeRemaining(INTERVIEW_TIME_LIMIT);
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

      // Add interviewer message (without evaluation display)
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

      // Check if interview should end (either by AI decision or time limit)
      if (data.should_end) {
        await endInterview();
      }
      // Timer continues running - no reset per response
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
    if (!textInput.trim() || isProcessing) return;

    // Capture text value before clearing to prevent race conditions
    const text = textInput.trim();
    setTextInput("");
    setIsProcessing(true);
    setStatusMessage(STATUS_MESSAGES.processing);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      await getInterviewerResponse(text);
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
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

        // Set interviewer names from API (random names per session)
        if (data.interviewer_names) {
          setInterviewerNames(data.interviewer_names);
        }

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

        // Start 5-minute countdown timer
        setTimeRemaining(INTERVIEW_TIME_LIMIT);
        setTimerActive(true);
        setTimerWarning(false);
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
    setTimerActive(false);

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

  // Force exit without saving - no score analysis
  const handleForceExit = () => {
    setShowExitWarning(true);
  };

  const confirmForceExit = async () => {
    if (!sessionId) {
      router.push("/dashboard");
      return;
    }

    // Just mark session as abandoned, no score calculation
    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      await (supabase
        .from("interview_sessions") as ReturnType<typeof supabase.from>)
        .update({ status: "abandoned" } as Record<string, unknown>)
        .eq("id", sessionId);
    } catch (err) {
      console.error("Failed to mark session as abandoned:", err);
    }

    // Navigate back to dashboard without saving results
    router.push("/dashboard");
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

  // Timer progress percentage (5 minutes = 300 seconds)
  const timerProgress = (timeRemaining / INTERVIEW_TIME_LIMIT) * 100;

  return (
    <PageTransition>
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          {interviewerTypes.map((type) => {
            const interviewer = INTERVIEWER_BASE[type];
            return (
              <InterviewerAvatar
                key={type}
                name={interviewerNames[type]}
                role={interviewer.role}
                emoji={interviewer.emoji}
                isActive={currentInterviewerId === type}
                isListening={currentInterviewerId === type && (isRecording || isSpeaking)}
                isThinking={currentInterviewerId === type && isProcessing}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isInterviewStarted && timerWarning ? "bg-destructive/20 text-destructive" : "bg-secondary/50"
            }`}
          >
            <Clock className={`w-4 h-4 ${isInterviewStarted && timerWarning ? "animate-pulse" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium tabular-nums">
              {isInterviewStarted ? formatTime(timeRemaining) : "5:00"}
            </span>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          {isInterviewStarted && (
            <>
              <Button variant="ghost" size="icon" onClick={togglePause}>
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              <Button variant="destructive" onClick={handleForceExit} className="gap-2">
                <Phone className="w-4 h-4" />
                면접 나가기
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

      {/* Exit Warning Modal */}
      <AnimatePresence>
        {showExitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-md mx-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">면접을 종료하시겠습니까?</h2>
              <p className="text-muted-foreground mb-6">
                지금 나가시면 <span className="text-destructive font-semibold">점수가 저장되지 않습니다.</span>
                <br />
                면접 결과 분석도 진행되지 않습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowExitWarning(false)}
                  className="gap-2"
                >
                  계속 진행
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmForceExit}
                  className="gap-2"
                >
                  <Phone className="w-4 h-4" />
                  나가기
                </Button>
              </div>
            </motion.div>
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
                {interviewerTypes.map((type, index) => (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-mint/20 to-soft-blue/20 flex items-center justify-center text-4xl"
                  >
                    {INTERVIEWER_BASE[type].emoji}
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
                <Button
                  size="xl"
                  onClick={() => router.push("/interview/setup")}
                  className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-none hover:shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:scale-[1.02]"
                >
                  설정 변경
                </Button>
                <Button variant="mint" size="xl" onClick={startInterview} className="gap-2">
                  <Mic className="w-5 h-5" />
                  면접 시작하기
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          // Interview Screen
          <div className="h-full flex flex-col">
            {/* AI Guidance Panel - Shows at interview start for 10 seconds */}
            <AnimatePresence>
              {showGuidance && (
                <motion.div
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="p-6 pb-0"
                >
                  <GuidancePanel
                    tips={[
                      { text: '구체적인 경험과 사례를 들어 설명하세요', type: 'detail' },
                      { text: '정량적 결과나 수치를 포함하면 좋습니다', type: 'detail' },
                      { text: '약 30초-1분 분량으로 답변해주세요', type: 'time' },
                    ]}
                    show={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => {
                const msgInterviewerType = message.interviewerId;
                const msgInterviewer = msgInterviewerType
                  ? INTERVIEWER_BASE[msgInterviewerType]
                  : null;
                const msgInterviewerName = msgInterviewerType
                  ? interviewerNames[msgInterviewerType]
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
                            {msgInterviewerName} ({msgInterviewer.role})
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

            {/* Input controls */}
            <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
              {/* Recording visualization */}
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <VoiceVisualizer
                    audioLevel={audioLevel}
                    isRecording={isRecording}
                    timeElapsed={120 - timeRemaining}
                  />
                  <div className="text-center mt-2">
                    <p className="text-sm text-muted-foreground">
                      🎤 녹음 중... {formatTime(120 - timeRemaining)}
                    </p>
                  </div>
                </motion.div>
              )}
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

              <div className="space-y-4">
                {/* Voice Input - Primary (Always visible) */}
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
                    disabled={isProcessing}
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
                        음성으로 답변
                      </>
                    )}
                  </Button>

                  {isRecording && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-mint"
                    >
                      🔴 녹음 중... 답변을 마친 후 버튼을 눌러주세요.
                    </motion.p>
                  )}
                </div>

                {/* Text Input Toggle Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowTextInput(!showTextInput)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-all text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Keyboard className="w-4 h-4" />
                    {showTextInput ? "텍스트 입력 숨기기" : "텍스트로 답변하기"}
                  </button>
                </div>

                {/* Text Input - Secondary (Toggleable) */}
                <AnimatePresence>
                  {showTextInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-3"
                    >
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleTextSubmit()}
                        placeholder="텍스트로 답변 입력..."
                        disabled={isProcessing}
                        className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-mint focus:ring-1 focus:ring-mint outline-none transition-all placeholder:text-muted-foreground/50"
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
    </PageTransition>
  );
}
