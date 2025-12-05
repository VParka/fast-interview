// ============================================
// User Store - Authentication & Profile
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Document } from '@/types/interview';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_type: string | null;
  industry: string | null;
}

export interface UserState {
  // User data
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // User's documents
  documents: Document[];

  // Interview history
  interviewCount: number;
  lastInterviewDate: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setIsLoading: (loading: boolean) => void;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (docId: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  incrementInterviewCount: () => void;
  logout: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  documents: [],
  interviewCount: 0,
  lastInterviewDate: null,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setDocuments: (documents) => set({ documents }),

      addDocument: (doc) => set((state) => ({
        documents: [doc, ...state.documents],
      })),

      removeDocument: (docId) => set((state) => ({
        documents: state.documents.filter(d => d.id !== docId),
      })),

      updateProfile: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      incrementInterviewCount: () => set((state) => ({
        interviewCount: state.interviewCount + 1,
        lastInterviewDate: new Date().toISOString(),
      })),

      logout: () => set({
        ...initialState,
        isLoading: false,
      }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        interviewCount: state.interviewCount,
        lastInterviewDate: state.lastInterviewDate,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: UserState) => state.user;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectDocuments = (state: UserState) => state.documents;
