// ============================================
// Interview Store - Zustand State Management
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  InterviewSession,
  Message,
  InterviewerType,
  INTERVIEWERS,
  AnswerTimerConfig,
} from '@/types/interview';

// Interview Status
export type InterviewStatus = 'idle' | 'setup' | 'ready' | 'active' | 'paused' | 'processing' | 'ended';

// Audio State
export interface AudioState {
  isRecording: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
  audioLevel: number; // 0-100 for visualization
}

// Timer State
export interface TimerState {
  isActive: boolean;
  timeRemaining: number; // seconds
  totalTime: number;
  isWarning: boolean;
}

// Interview Store State
export interface InterviewState {
  // Session
  session: InterviewSession | null;
  status: InterviewStatus;
  error: string | null;

  // Messages
  messages: Message[];
  currentInterviewerId: InterviewerType;

  // Audio
  audio: AudioState;

  // Timer
  timer: TimerState;

  // UI States
  showInnerThoughts: boolean;
  inputMode: 'voice' | 'text';

  // Actions
  setSession: (session: InterviewSession | null) => void;
  setStatus: (status: InterviewStatus) => void;
  setError: (error: string | null) => void;

  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;

  setCurrentInterviewer: (id: InterviewerType) => void;
  rotateInterviewer: () => void;

  setAudio: (audio: Partial<AudioState>) => void;
  setTimer: (timer: Partial<TimerState>) => void;
  resetTimer: (config?: AnswerTimerConfig) => void;
  tickTimer: () => void;

  setShowInnerThoughts: (show: boolean) => void;
  setInputMode: (mode: 'voice' | 'text') => void;

  startInterview: (session: InterviewSession) => void;
  pauseInterview: () => void;
  resumeInterview: () => void;
  endInterview: () => void;
  reset: () => void;
}

// Default timer config
const DEFAULT_TIMER_CONFIG: AnswerTimerConfig = {
  default_time_limit: 120,
  warning_threshold: 30,
  auto_submit_on_timeout: true,
};

// Initial state
const initialState = {
  session: null,
  status: 'idle' as InterviewStatus,
  error: null,
  messages: [],
  currentInterviewerId: 'hiring_manager' as InterviewerType,
  audio: {
    isRecording: false,
    isMuted: false,
    isPlaying: false,
    volume: 100,
    audioLevel: 0,
  },
  timer: {
    isActive: false,
    timeRemaining: DEFAULT_TIMER_CONFIG.default_time_limit,
    totalTime: DEFAULT_TIMER_CONFIG.default_time_limit,
    isWarning: false,
  },
  showInnerThoughts: false,
  inputMode: 'voice' as const,
};

// Interviewer rotation weights
const INTERVIEWER_WEIGHTS: Record<InterviewerType, number> = {
  hiring_manager: 0.4,
  hr_manager: 0.2,
  senior_peer: 0.4,
};

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Session actions
      setSession: (session) => set({ session }),
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),

      // Message actions
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
      })),
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [] }),

      // Interviewer actions
      setCurrentInterviewer: (id) => set({ currentInterviewerId: id }),

      rotateInterviewer: () => {
        const { currentInterviewerId } = get();
        const interviewerIds = Object.keys(INTERVIEWER_WEIGHTS) as InterviewerType[];

        // Filter out current interviewer to avoid consecutive same interviewer
        const otherInterviewers = interviewerIds.filter(id => id !== currentInterviewerId);

        // Calculate weighted random selection
        const random = Math.random();
        let cumulative = 0;

        // Normalize weights for remaining interviewers
        const totalWeight = otherInterviewers.reduce(
          (sum, id) => sum + INTERVIEWER_WEIGHTS[id],
          0
        );

        for (const id of otherInterviewers) {
          cumulative += INTERVIEWER_WEIGHTS[id] / totalWeight;
          if (random <= cumulative) {
            set({ currentInterviewerId: id });
            return;
          }
        }

        // Fallback
        set({ currentInterviewerId: otherInterviewers[0] });
      },

      // Audio actions
      setAudio: (audio) => set((state) => ({
        audio: { ...state.audio, ...audio },
      })),

      // Timer actions
      setTimer: (timer) => set((state) => ({
        timer: { ...state.timer, ...timer },
      })),

      resetTimer: (config = DEFAULT_TIMER_CONFIG) => set({
        timer: {
          isActive: false,
          timeRemaining: config.default_time_limit,
          totalTime: config.default_time_limit,
          isWarning: false,
        },
      }),

      tickTimer: () => {
        const { timer, session } = get();
        if (!timer.isActive || timer.timeRemaining <= 0) return;

        const newTimeRemaining = timer.timeRemaining - 1;
        const warningThreshold = session?.timer_config?.warning_threshold || 30;

        set({
          timer: {
            ...timer,
            timeRemaining: newTimeRemaining,
            isWarning: newTimeRemaining <= warningThreshold,
          },
        });
      },

      // UI actions
      setShowInnerThoughts: (show) => set({ showInnerThoughts: show }),
      setInputMode: (mode) => set({ inputMode: mode }),

      // Interview lifecycle
      startInterview: (session) => {
        const timerConfig = session.timer_config as AnswerTimerConfig || DEFAULT_TIMER_CONFIG;
        set({
          session,
          status: 'active',
          error: null,
          messages: [],
          currentInterviewerId: 'hiring_manager',
          timer: {
            isActive: false,
            timeRemaining: timerConfig.default_time_limit,
            totalTime: timerConfig.default_time_limit,
            isWarning: false,
          },
        });
      },

      pauseInterview: () => {
        const { status } = get();
        if (status === 'active') {
          set({
            status: 'paused',
            timer: { ...get().timer, isActive: false },
          });
        }
      },

      resumeInterview: () => {
        const { status } = get();
        if (status === 'paused') {
          set({ status: 'active' });
        }
      },

      endInterview: () => {
        set({
          status: 'ended',
          timer: { ...get().timer, isActive: false },
          audio: { ...get().audio, isRecording: false, isPlaying: false },
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'interview-storage',
      partialize: (state) => ({
        // Only persist certain fields
        showInnerThoughts: state.showInnerThoughts,
        inputMode: state.inputMode,
        audio: {
          isMuted: state.audio.isMuted,
          volume: state.audio.volume,
        },
      }),
    }
  )
);

// Selectors
export const selectSession = (state: InterviewState) => state.session;
export const selectStatus = (state: InterviewState) => state.status;
export const selectMessages = (state: InterviewState) => state.messages;
export const selectCurrentInterviewer = (state: InterviewState) => state.currentInterviewerId;
export const selectTimer = (state: InterviewState) => state.timer;
export const selectAudio = (state: InterviewState) => state.audio;
