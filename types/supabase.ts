export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      competencies: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          evaluation_criteria: string[] | null
          id: string
          name_en: string
          name_ko: string
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          evaluation_criteria?: string[] | null
          id?: string
          name_en: string
          name_ko: string
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          evaluation_criteria?: string[] | null
          id?: string
          name_en?: string
          name_ko?: string
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          id: string
          meta: Json
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          id?: string
          meta?: Json
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          meta?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          current_credits: number
          id: string
          total_earned: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_credits?: number
          id?: string
          total_earned?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_credits?: number
          id?: string
          total_earned?: number
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_login_log: {
        Row: {
          id: string
          reward_date: string
          rewarded_at: string
          user_id: string
        }
        Insert: {
          id?: string
          reward_date?: string
          rewarded_at?: string
          user_id: string
        }
        Update: {
          id?: string
          reward_date?: string
          rewarded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string
          content_tsv: unknown
          created_at: string | null
          embedding: string | null
          filename: string
          id: string
          metadata: Json | null
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
        }
        Insert: {
          content: string
          content_tsv?: unknown
          created_at?: string | null
          embedding?: string | null
          filename: string
          id?: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["document_type"]
          user_id: string
        }
        Update: {
          content?: string
          content_tsv?: unknown
          created_at?: string | null
          embedding?: string | null
          filename?: string
          id?: string
          metadata?: Json | null
          type?: Database["public"]["Enums"]["document_type"]
          user_id?: string
        }
        Relationships: []
      }
      emotion_analyses: {
        Row: {
          average_scores: Json
          created_at: string | null
          id: string
          result_id: string
          timeline: Json
        }
        Insert: {
          average_scores: Json
          created_at?: string | null
          id?: string
          result_id: string
          timeline?: Json
        }
        Update: {
          average_scores?: Json
          created_at?: string | null
          id?: string
          result_id?: string
          timeline?: Json
        }
        Relationships: [
          {
            foreignKeyName: "emotion_analyses_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: true
            referencedRelation: "interview_results"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_ko: string
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_ko: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_ko?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      interview_results: {
        Row: {
          category_scores: Json | null
          competency_scores: Json
          created_at: string | null
          feedback_summary: string
          growth_index: number | null
          id: string
          improvements: string[] | null
          interviewer_comments: Json | null
          interviewer_scores: Json
          overall_score: number
          pass_status: Database["public"]["Enums"]["pass_status"]
          rank_percentile: number | null
          session_id: string
          strengths: string[] | null
          user_id: string
        }
        Insert: {
          category_scores?: Json | null
          competency_scores: Json
          created_at?: string | null
          feedback_summary: string
          growth_index?: number | null
          id?: string
          improvements?: string[] | null
          interviewer_comments?: Json | null
          interviewer_scores: Json
          overall_score: number
          pass_status: Database["public"]["Enums"]["pass_status"]
          rank_percentile?: number | null
          session_id: string
          strengths?: string[] | null
          user_id: string
        }
        Update: {
          category_scores?: Json | null
          competency_scores?: Json
          created_at?: string | null
          feedback_summary?: string
          growth_index?: number | null
          id?: string
          improvements?: string[] | null
          interviewer_comments?: Json | null
          interviewer_scores?: Json
          overall_score?: number
          pass_status?: Database["public"]["Enums"]["pass_status"]
          rank_percentile?: number | null
          session_id?: string
          strengths?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          company_doc_ids: string[] | null
          created_at: string | null
          current_interviewer_id: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          industry: string | null
          job_type: string
          max_turns: number
          portfolio_doc_id: string | null
          resume_doc_id: string | null
          status: Database["public"]["Enums"]["session_status"]
          timer_config: Json | null
          turn_count: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_doc_ids?: string[] | null
          created_at?: string | null
          current_interviewer_id?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          industry?: string | null
          job_type: string
          max_turns?: number
          portfolio_doc_id?: string | null
          resume_doc_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          timer_config?: Json | null
          turn_count?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_doc_ids?: string[] | null
          created_at?: string | null
          current_interviewer_id?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          industry?: string | null
          job_type?: string
          max_turns?: number
          portfolio_doc_id?: string | null
          resume_doc_id?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          timer_config?: Json | null
          turn_count?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_portfolio_doc_id_fkey"
            columns: ["portfolio_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_resume_doc_id_fkey"
            columns: ["resume_doc_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      interviewer_names: {
        Row: {
          created_at: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          role_type: string
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role_type: string
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role_type?: string
        }
        Relationships: []
      }
      interviewer_personas: {
        Row: {
          base_probability: number | null
          created_at: string | null
          emoji: string
          evaluation_criteria: string[] | null
          focus_areas: string[] | null
          id: string
          name: string
          personality: string | null
          role: string
          system_prompt: string
          tone: string[] | null
        }
        Insert: {
          base_probability?: number | null
          created_at?: string | null
          emoji: string
          evaluation_criteria?: string[] | null
          focus_areas?: string[] | null
          id: string
          name: string
          personality?: string | null
          role: string
          system_prompt: string
          tone?: string[] | null
        }
        Update: {
          base_probability?: number | null
          created_at?: string | null
          emoji?: string
          evaluation_criteria?: string[] | null
          focus_areas?: string[] | null
          id?: string
          name?: string
          personality?: string | null
          role?: string
          system_prompt?: string
          tone?: string[] | null
        }
        Relationships: []
      }
      job_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_ko: string
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_ko: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_ko?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string | null
          id: string
          interviewer_id: string | null
          latency_ms: number | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          structured_response: Json | null
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          interviewer_id?: string | null
          latency_ms?: number | null
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          structured_response?: Json | null
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          interviewer_id?: string | null
          latency_ms?: number | null
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
          structured_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          industry: string | null
          job_type: string | null
          kakao_id: string | null
          settings: Json | null
          target_industry: string | null
          target_job: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          industry?: string | null
          job_type?: string | null
          kakao_id?: string | null
          settings?: Json | null
          target_industry?: string | null
          target_job?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          job_type?: string | null
          kakao_id?: string | null
          settings?: Json | null
          target_industry?: string | null
          target_job?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_categories: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name_en: string
          name_ko: string
          sort_order: number | null
          weight: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name_en: string
          name_ko: string
          sort_order?: number | null
          weight?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name_en?: string
          name_ko?: string
          sort_order?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          category: string
          created_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          evaluation_points: string[]
          follow_ups: string[] | null
          id: string
          industry: string | null
          job_type: string | null
          question_text: string
          sample_answer: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          evaluation_points?: string[]
          follow_ups?: string[] | null
          id?: string
          industry?: string | null
          job_type?: string | null
          question_text: string
          sample_answer?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          evaluation_points?: string[]
          follow_ups?: string[] | null
          id?: string
          industry?: string | null
          job_type?: string | null
          question_text?: string
          sample_answer?: string | null
        }
        Relationships: []
      }
      ranking_cache: {
        Row: {
          avg_score: number
          best_score: number
          id: string
          interview_count: number
          job_type: string
          percentile: number
          rank_position: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_score: number
          best_score: number
          id?: string
          interview_count?: number
          job_type?: string
          percentile: number
          rank_position: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_score?: number
          best_score?: number
          id?: string
          interview_count?: number
          job_type?: string
          percentile?: number
          rank_position?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ranking_cache_meta: {
        Row: {
          avg_score: number | null
          id: string
          job_type: string
          median_score: number | null
          std_dev: number | null
          total_interviews: number
          total_users: number
          updated_at: string | null
        }
        Insert: {
          avg_score?: number | null
          id?: string
          job_type?: string
          median_score?: number | null
          std_dev?: number | null
          total_interviews?: number
          total_users?: number
          updated_at?: string | null
        }
        Update: {
          avg_score?: number | null
          id?: string
          job_type?: string
          median_score?: number | null
          std_dev?: number | null
          total_interviews?: number
          total_users?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      referral: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_at: string | null
          referred_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_at?: string | null
          referred_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_at?: string | null
          referred_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      speech_analytics: {
        Row: {
          articulation_score: number
          created_at: string | null
          filler_words: Json
          id: string
          result_id: string
          silence_patterns: Json
          words_per_minute: number
        }
        Insert: {
          articulation_score: number
          created_at?: string | null
          filler_words?: Json
          id?: string
          result_id: string
          silence_patterns: Json
          words_per_minute: number
        }
        Update: {
          articulation_score?: number
          created_at?: string | null
          filler_words?: Json
          id?: string
          result_id?: string
          silence_patterns?: Json
          words_per_minute?: number
        }
        Relationships: [
          {
            foreignKeyName: "speech_analytics_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: true
            referencedRelation: "interview_results"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interview_summaries: {
        Row: {
          created_at: string | null
          id: string
          industry: string | null
          job_type: string
          session_id: string
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          industry?: string | null
          job_type: string
          session_id: string
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          industry?: string | null
          job_type?: string
          session_id?: string
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interview_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keywords: {
        Row: {
          category: Database["public"]["Enums"]["keyword_category"]
          context: string | null
          created_at: string | null
          id: string
          keyword: string
          mentioned_count: number
          session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["keyword_category"]
          context?: string | null
          created_at?: string | null
          id?: string
          keyword: string
          mentioned_count?: number
          session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["keyword_category"]
          context?: string | null
          created_at?: string | null
          id?: string
          keyword?: string
          mentioned_count?: number
          session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_keywords_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      documents_stats: {
        Row: {
          documents_with_embedding: number | null
          portfolio_count: number | null
          recommended_ivf_lists: number | null
          resume_count: number | null
          table_size: string | null
          total_documents: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      question_statistics: {
        Row: {
          category: string | null
          difficulty: string | null
          general_questions: number | null
          job_type: string | null
          question_count: number | null
          specific_questions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credit: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      award_daily_login: {
        Args: {
          p_amount?: number
          p_min_interval_hours?: number
          p_user_id: string
        }
        Returns: Json
      }
      award_referral: {
        Args: {
          p_friend_user_id: string
          p_referral_code: string
          p_referrer_amount?: number
          p_self_amount?: number
        }
        Returns: Json
      }
      calculate_growth_index: { Args: { p_user_id: string }; Returns: number }
      calculate_rankings_batch: {
        Args: { p_job_type?: string }
        Returns: {
          avg_score: number
          best_score: number
          interview_count: number
          percentile: number
          rank_position: number
          user_id: string
        }[]
      }
      ensure_credit_account: { Args: { p_user_id: string }; Returns: undefined }
      ensure_ranking_tables: { Args: never; Returns: undefined }
      ensure_referral_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: { p_length?: number }; Returns: string }
      get_cached_leaderboard: {
        Args: { p_job_type?: string; p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          avg_score: number
          best_score: number
          full_name: string
          interview_count: number
          percentile: number
          rank_position: number
          user_id: string
        }[]
      }
      get_competency_comparison: {
        Args: { p_job_type?: string; p_user_id: string }
        Returns: {
          competency: string
          global_avg: number
          percentile: number
          trend: string
          user_avg: number
        }[]
      }
      get_dashboard_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_duration_minutes: number
          avg_score: number
          best_score: number
          completed_interviews: number
          current_streak: number
          latest_score: number
          pass_rate: number
          rank_percentile: number
          total_interviews: number
          total_questions_answered: number
        }[]
      }
      get_interview_history: {
        Args: {
          p_job_type?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_user_id: string
        }
        Returns: {
          completed_at: string
          created_at: string
          difficulty: string
          duration_minutes: number
          industry: string
          job_type: string
          overall_score: number
          pass_status: string
          session_id: string
          status: string
          turn_count: number
        }[]
      }
      get_interview_result_details: {
        Args: { p_session_id: string }
        Returns: {
          competency_scores: Json
          difficulty: string
          duration_minutes: number
          feedback_summary: string
          improvements: string[]
          industry: string
          interviewer_scores: Json
          job_type: string
          messages_count: number
          overall_score: number
          pass_status: string
          rank_percentile: number
          result_created_at: string
          result_id: string
          session_created_at: string
          session_id: string
          strengths: string[]
          turn_count: number
          user_id: string
        }[]
      }
      get_leaderboard: {
        Args: { p_job_type?: string; p_limit?: number; p_period?: string }
        Returns: {
          avatar_url: string
          avg_score: number
          best_score: number
          full_name: string
          interview_count: number
          last_interview: string
          rank_position: number
          user_id: string
        }[]
      }
      get_optimal_ivfflat_lists: { Args: never; Returns: number }
      get_random_interviewer_names: {
        Args: never
        Returns: {
          hiring_manager_name: string
          hr_manager_name: string
          senior_peer_name: string
        }[]
      }
      get_random_questions: {
        Args: {
          p_categories?: string[]
          p_count?: number
          p_difficulty?: string
          p_job_type: string
        }
        Returns: {
          category: string
          evaluation_points: string[]
          follow_ups: string[]
          id: string
          question_text: string
        }[]
      }
      get_score_trends: {
        Args: { p_days?: number; p_job_type?: string; p_user_id: string }
        Returns: {
          avg_competency_adaptability: number
          avg_competency_behavioral: number
          avg_competency_clarity: number
          avg_competency_communication: number
          avg_competency_comprehension: number
          avg_competency_leadership: number
          avg_competency_problem_solving: number
          avg_competency_reasoning: number
          avg_score: number
          date: string
          interview_count: number
          max_score: number
          min_score: number
        }[]
      }
      get_user_rank: {
        Args: { p_job_type?: string; p_user_id: string }
        Returns: {
          avg_score: number
          best_score: number
          cache_age_minutes: number
          interview_count: number
          is_cached: boolean
          percentile: number
          rank_position: number
          total_users: number
        }[]
      }
      get_user_rank_percentile: {
        Args: { p_job_type: string; p_user_id: string }
        Returns: number
      }
      get_user_rank_percentile_enhanced: {
        Args: { p_job_type?: string; p_user_id: string }
        Returns: {
          comparison_text: string
          mean_score: number
          percentile: number
          rank_position: number
          std_dev: number
          total_users: number
          user_score: number
          z_score: number
        }[]
      }
      hybrid_search: {
        Args: {
          bm25_weight?: number
          match_count: number
          p_user_id?: string
          query_embedding: string
          query_text: string
          rrf_k?: number
          vector_weight?: number
        }
        Returns: {
          bm25_score: number
          combined_score: number
          content: string
          id: string
          metadata: Json
          vector_score: number
        }[]
      }
      match_documents: {
        Args: {
          match_count: number
          match_threshold: number
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      upsert_user_keyword: {
        Args: {
          p_category: Database["public"]["Enums"]["keyword_category"]
          p_context: string
          p_keyword: string
          p_mentioned_count: number
          p_session_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      use_credit: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      difficulty_level: "easy" | "medium" | "hard"
      document_type: "resume" | "company" | "job_description" | "portfolio"
      keyword_category:
        | "technical"
        | "soft_skill"
        | "experience"
        | "project"
        | "strength"
        | "weakness"
      message_role: "user" | "interviewer" | "system"
      pass_status: "pass" | "borderline" | "fail"
      session_status: "waiting" | "active" | "paused" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      difficulty_level: ["easy", "medium", "hard"],
      document_type: ["resume", "company", "job_description", "portfolio"],
      keyword_category: [
        "technical",
        "soft_skill",
        "experience",
        "project",
        "strength",
        "weakness",
      ],
      message_role: ["user", "interviewer", "system"],
      pass_status: ["pass", "borderline", "fail"],
      session_status: ["waiting", "active", "paused", "completed"],
    },
  },
} as const
