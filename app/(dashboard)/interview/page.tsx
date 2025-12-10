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
  Eye,
} from "lucide-react";
import { INTERVIEWER_BASE, type InterviewerType, type SessionInterviewerNames } from "@/types/interview";
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

  // Guide overlay state - shows BEFORE interview starts
  const [showStartGuide, setShowStartGuide] = useState(false);
  const [guideCountdown, setGuideCountdown] = useState(5);

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

  // Show guide overlay first, then start interview with countdown
  const handleStartClick = () => {
    setShowStartGuide(true);
    setGuideCountdown(5);

    // Countdown from 5 to 1, then start interview
    let count = 5;
    const countdownInterval = setInterval(() => {
      count--;
      setGuideCountdown(count);

      if (count <= 0) {
        clearInterval(countdownInterval);
        setShowStartGuide(false);
        startInterview();
      }
    }, 1000);
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

    // Calculate elapsed time (in seconds)
    const elapsedTime = INTERVIEW_TIME_LIMIT - timeRemaining;
    const MINIMUM_INTERVIEW_TIME = 300; // 5 minutes in seconds

    try {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();

      if (elapsedTime < MINIMUM_INTERVIEW_TIME) {
        // Less than 5 minutes - delete session and messages completely
        // Delete messages first (foreign key constraint)
        await supabase
          .from("messages")
          .delete()
          .eq("session_id", sessionId);

        // Delete session
        await supabase
          .from("interview_sessions")
          .delete()
          .eq("id", sessionId);

        console.log("Interview session deleted (duration < 5 minutes)");
      } else {
        // 5 minutes or more - just mark as abandoned
        await (supabase
          .from("interview_sessions") as ReturnType<typeof supabase.from>)
          .update({ status: "abandoned" } as Record<string, unknown>)
          .eq("id", sessionId);

        console.log("Interview session marked as abandoned");
      }
    } catch (err) {
      console.error("Failed to handle session exit:", err);
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
      {/* Header - Premium Minimal */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[hsl(220,40%,15%)] bg-[hsl(220,55%,6%)]">
        <div className="flex items-center gap-4">
          {/* All 3 interviewers displayed */}
          {interviewerTypes.map((type) => {
            const interviewer = INTERVIEWER_BASE[type];
            const isActive = currentInterviewerId === type;
            
            return (
              <div
                key={type}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all w-36 ${
                  isActive
                    ? "bg-[hsl(var(--mint)/0.2)] border border-[hsl(var(--mint)/0.5)]"
                    : "bg-slate-800/50 border border-slate-700/50 opacity-60"
                }`}
              >
                <span className="text-lg">{interviewer.emoji}</span>
                <div className="flex flex-col">
                  <span className={`text-xs font-medium ${
                    isActive ? "text-mint" : "text-slate-400"
                  }`}>
                    {interviewerNames[type]}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {interviewer.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Inner thoughts toggle - moved to header */}
          <button
            onClick={() => setShowInnerThoughts(!showInnerThoughts)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
              showInnerThoughts
                ? "bg-violet-500/20 border border-violet-500/30 text-violet-400"
                : "bg-slate-800/50 border border-slate-700/50 text-slate-500 hover:text-slate-300"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>속마음 {showInnerThoughts ? "ON" : "OFF"}</span>
          </button>

          {/* Timer - Minimal */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${
              isInterviewStarted && timerWarning
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : "bg-slate-800/50 border border-slate-700/50"
            }`}
          >
            <Clock className={`w-4 h-4 ${timerWarning ? "animate-pulse" : "text-slate-400"}`} />
            <span className="text-sm font-medium tabular-nums">
              {isInterviewStarted ? formatTime(timeRemaining) : "5:00"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 rounded-md"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          {isInterviewStarted && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePause}
                className="w-8 h-8 rounded-full"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button
                onClick={handleForceExit}
                className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium shadow-none"
              >
                <Phone className="w-4 h-4 mr-2" />
                나가기
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Pause Overlay - Premium */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[hsl(220,55%,6%)/0.95] backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-lg bg-[hsl(var(--mint)/0.1)] border border-[hsl(var(--mint)/0.3)] flex items-center justify-center">
                <Pause className="w-8 h-8 text-mint" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">일시정지</h2>
              <p className="text-slate-400 mb-8">준비되면 재개하세요</p>
              <Button
                onClick={togglePause}
                className="h-12 px-8 rounded-lg bg-gradient-to-r from-[hsl(var(--mint))] to-[hsl(var(--mint-dark))] text-slate-900"
              >
                <Play className="w-5 h-5 mr-2" />
                재개
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Warning Modal - Premium */}
      <AnimatePresence>
        {showExitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[hsl(220,55%,6%)/0.95] backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[hsl(220,50%,8%)] border border-slate-700/50 rounded-lg p-8 max-w-md mx-4 text-center"
            >
              <div className="w-14 h-14 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">면접을 종료하시겠습니까?</h2>
              <p className="text-slate-400 mb-6 text-sm">
                지금 나가시면 <span className="text-red-400 font-medium">점수가 저장되지 않습니다.</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowExitWarning(false)}
                  className="h-10 px-6 rounded-md border-slate-600"
                >
                  계속
                </Button>
                <Button
                  onClick={confirmForceExit}
                  className="h-10 px-6 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                >
                  나가기
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-Interview Guide - Premium (No Emoji) */}
      <AnimatePresence>
        {showStartGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[hsl(220,55%,6%)/0.98] backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[hsl(220,50%,8%)] border border-[hsl(var(--mint)/0.2)] rounded-lg p-8 max-w-lg mx-4 text-center shadow-[0_0_40px_hsl(var(--mint)/0.1)]"
            >
              <div className="w-14 h-14 rounded-lg bg-[hsl(var(--mint)/0.1)] border border-[hsl(var(--mint)/0.3)] flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-7 h-7 text-mint" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-6">답변 팁</h2>
              <div className="space-y-3 text-left mb-8">
                <div className="flex items-start gap-3 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                  <div className="w-6 h-6 rounded-md bg-[hsl(var(--mint)/0.1)] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-mint" />
                  </div>
                  <p className="text-sm text-slate-300">구체적인 경험과 사례를 들어 설명하세요</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                  <div className="w-6 h-6 rounded-md bg-[hsl(var(--mint)/0.1)] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-mint" />
                  </div>
                  <p className="text-sm text-slate-300">정량적 결과나 수치를 포함하면 좋습니다</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                  <div className="w-6 h-6 rounded-md bg-[hsl(var(--mint)/0.1)] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-mint" />
                  </div>
                  <p className="text-sm text-slate-300">약 30초-1분 분량으로 답변해주세요</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-bold text-mint">{guideCountdown}</span>
                <span className="text-sm text-slate-400">초 후 시작</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!isInterviewStarted ? (
          // Start Screen - Premium Minimal
          <div className="h-full flex items-center justify-center bg-[hsl(220,55%,6%)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-lg"
            >
              {/* Interviewer Cards */}
              <div className="flex justify-center gap-4 mb-10">
                {interviewerTypes.map((type, index) => {
                  const interviewer = INTERVIEWER_BASE[type];
                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 w-24"
                    >
                      <span className="text-2xl">{interviewer.emoji}</span>
                      <span className="text-xs font-medium text-slate-300">
                        {interviewerNames[type]}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {interviewer.role}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <h1 className="text-3xl font-semibold text-white mb-4 tracking-tight">
                AI 면접을 시작할 준비가
                <br />
                <span className="text-mint">되셨나요?</span>
              </h1>
              <p className="text-slate-400 mb-10">
                3인의 AI 면접관이 실시간으로 질문합니다
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleStartClick}
                  className="h-12 px-6 rounded-md bg-slate-800/50 border border-slate-600 hover:bg-slate-700/50"
                >
                  모의 면접
                </Button>
                <Button
                  onClick={() => router.push("/interview/setup")}
                  className="h-12 px-8 rounded-lg bg-gradient-to-r from-[hsl(var(--mint))] to-[hsl(var(--mint-dark))] text-slate-900 hover:shadow-[var(--glow-mint)] transition-shadow"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  시작하기
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          // Interview Screen - No guidance panel here, it shows before interview starts
          <div className="h-full flex flex-col">
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "interviewer" && msgInterviewer && (
                      <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center shrink-0">
                        <span className="text-lg">{msgInterviewer.emoji}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-2xl">
                      <div
                        className={`p-4 rounded-lg ${
                          message.role === "user"
                            ? "bg-[hsl(var(--mint)/0.15)] border border-[hsl(var(--mint)/0.3)]"
                            : "bg-slate-800/30 border border-slate-700/50"
                        }`}
                      >
                        {message.role === "interviewer" && msgInterviewer && (
                          <p className="text-xs text-slate-500 mb-2">
                            {msgInterviewerName} ({msgInterviewer.role})
                          </p>
                        )}
                        <p className={`text-sm leading-relaxed ${
                          message.role === "user" ? "text-white" : "text-slate-200"
                        }`}>
                          {message.content}
                        </p>
                      </div>

                      {/* Inner thought bubble - no emoji */}
                      {showInnerThoughts && message.innerThought && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20"
                        >
                          <p className="text-xs text-violet-400 italic">
                            {message.innerThought}
                          </p>
                        </motion.div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="w-10 h-10 rounded-lg bg-[hsl(var(--mint)/0.1)] border border-[hsl(var(--mint)/0.3)] flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-mint" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Processing indicator */}
              {isProcessing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                    <span className="text-lg animate-pulse">
                      {currentInterviewer.emoji}
                    </span>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 px-4 py-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-2">{statusMessage}</p>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 bg-mint rounded-full"
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

            {/* Input controls - Premium */}
            <div className="border-t border-[hsl(220,40%,15%)] p-4 bg-[hsl(220,55%,6%)]">
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
                    <p className="text-sm text-slate-400">
                      녹음 중… {formatTime(120 - timeRemaining)}
                    </p>
                  </div>
                </motion.div>
              )}
              {/* Timer Progress Bar - Mint Gradient */}
              {timerActive && (
                <div className="mb-4">
                  <div className="h-1 bg-slate-800 overflow-hidden rounded-full">
                    <motion.div
                      className={`h-full ${timerWarning ? "bg-red-500" : "bg-gradient-to-r from-[hsl(var(--mint))] to-[hsl(var(--mint-dark))]"}`}
                      initial={{ width: "100%" }}
                      animate={{ width: `${timerProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Voice Input - Primary */}
                <div className="flex flex-col items-center gap-4">
                  {/* Audio level visualization */}
                  {isRecording && (
                    <div className="flex items-center gap-0.5 h-8">
                      {[...Array(24)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-mint rounded-full"
                          animate={{
                            height: audioLevel > i * 4 ? `${8 + Math.random() * 20}px` : "4px",
                          }}
                          transition={{ duration: 0.1 }}
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`w-48 h-12 rounded-lg transition-all ${
                      isRecording
                        ? "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                        : "bg-gradient-to-r from-[hsl(var(--mint))] to-[hsl(var(--mint-dark))] text-slate-900 hover:shadow-[var(--glow-mint)]"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-5 h-5 mr-2" />
                        중지
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 mr-2" />
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
                      녹음 중… 답변을 마친 후 버튼을 눌러주세요
                    </motion.p>
                  )}

                  {/* Text input toggle - compact link style below voice button */}
                  <button
                    onClick={() => setShowTextInput(!showTextInput)}
                    className="text-xs text-slate-500 hover:text-mint transition-colors flex items-center gap-1"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    {showTextInput ? "텍스트 입력 숨기기" : "텍스트로 답변하기"}
                  </button>
                </div>


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
                        placeholder="텍스트로 답변…"
                        disabled={isProcessing}
                        className="flex-1 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 focus:border-[hsl(var(--mint)/0.5)] outline-none transition-all placeholder:text-slate-500 text-sm"
                      />
                      <Button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || isProcessing}
                        className="h-12 px-6 rounded-lg bg-[hsl(var(--mint)/0.2)] border border-[hsl(var(--mint)/0.3)] text-mint hover:bg-[hsl(var(--mint)/0.3)]"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        전송
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
