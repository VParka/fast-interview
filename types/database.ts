// ============================================
// Supabase Database Types
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          job_type: string | null;
          industry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          job_type?: string | null;
          industry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          job_type?: string | null;
          industry?: string | null;
          updated_at?: string;
        };
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          job_type: string;
          industry: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          resume_doc_id: string | null;
          company_doc_ids: string[] | null;
          status: 'waiting' | 'active' | 'paused' | 'completed';
          turn_count: number;
          max_turns: number;
          timer_config: Json;
          current_interviewer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_type: string;
          industry?: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          resume_doc_id?: string | null;
          company_doc_ids?: string[] | null;
          status?: 'waiting' | 'active' | 'paused' | 'completed';
          turn_count?: number;
          max_turns?: number;
          timer_config?: Json;
          current_interviewer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          job_type?: string;
          industry?: string | null;
          difficulty?: 'easy' | 'medium' | 'hard';
          resume_doc_id?: string | null;
          company_doc_ids?: string[] | null;
          status?: 'waiting' | 'active' | 'paused' | 'completed';
          turn_count?: number;
          current_interviewer_id?: string | null;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'interviewer' | 'system';
          interviewer_id: string | null;
          content: string;
          structured_response: Json | null;
          audio_url: string | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: 'user' | 'interviewer' | 'system';
          interviewer_id?: string | null;
          content: string;
          structured_response?: Json | null;
          audio_url?: string | null;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: {
          content?: string;
          structured_response?: Json | null;
          audio_url?: string | null;
        };
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: 'resume' | 'company' | 'job_description' | 'portfolio';
          filename: string;
          content: string;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'resume' | 'company' | 'job_description' | 'portfolio';
          filename: string;
          content: string;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          content?: string;
          embedding?: number[] | null;
          metadata?: Json;
        };
      };
      interview_results: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          overall_score: number;
          pass_status: 'pass' | 'borderline' | 'fail';
          interviewer_scores: Json;
          competency_scores: Json;
          rank_percentile: number | null;
          growth_index: number | null;
          feedback_summary: string;
          strengths: string[];
          improvements: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          overall_score: number;
          pass_status: 'pass' | 'borderline' | 'fail';
          interviewer_scores: Json;
          competency_scores: Json;
          rank_percentile?: number | null;
          growth_index?: number | null;
          feedback_summary: string;
          strengths: string[];
          improvements: string[];
          created_at?: string;
        };
        Update: {
          overall_score?: number;
          pass_status?: 'pass' | 'borderline' | 'fail';
          rank_percentile?: number | null;
          growth_index?: number | null;
        };
      };
      emotion_analyses: {
        Row: {
          id: string;
          result_id: string;
          timeline: Json;
          average_scores: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          timeline: Json;
          average_scores: Json;
          created_at?: string;
        };
        Update: {
          timeline?: Json;
          average_scores?: Json;
        };
      };
      speech_analytics: {
        Row: {
          id: string;
          result_id: string;
          words_per_minute: number;
          filler_words: Json;
          silence_patterns: Json;
          articulation_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          result_id: string;
          words_per_minute: number;
          filler_words: Json;
          silence_patterns: Json;
          articulation_score: number;
          created_at?: string;
        };
        Update: {
          words_per_minute?: number;
          filler_words?: Json;
          silence_patterns?: Json;
          articulation_score?: number;
        };
      };
      questions: {
        Row: {
          id: string;
          category: string;
          job_type: string | null;
          industry: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          question_text: string;
          evaluation_points: string[];
          sample_answer: string | null;
          follow_ups: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          job_type?: string | null;
          industry?: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          question_text: string;
          evaluation_points: string[];
          sample_answer?: string | null;
          follow_ups?: string[] | null;
          created_at?: string;
        };
        Update: {
          category?: string;
          job_type?: string | null;
          industry?: string | null;
          difficulty?: 'easy' | 'medium' | 'hard';
          question_text?: string;
          evaluation_points?: string[];
          sample_answer?: string | null;
          follow_ups?: string[] | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      get_user_rank_percentile: {
        Args: {
          p_user_id: string;
          p_job_type: string;
        };
        Returns: number;
      };
    };
    Enums: {
      difficulty_level: 'easy' | 'medium' | 'hard';
      session_status: 'waiting' | 'active' | 'paused' | 'completed';
      message_role: 'user' | 'interviewer' | 'system';
      document_type: 'resume' | 'company' | 'job_description' | 'portfolio';
      pass_status: 'pass' | 'borderline' | 'fail';
    };
  };
}
