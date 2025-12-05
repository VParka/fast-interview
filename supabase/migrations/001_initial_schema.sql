-- ============================================
-- IMSAM AI Interview Service - Database Schema
-- ============================================
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enum Types
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE session_status AS ENUM ('waiting', 'active', 'paused', 'completed');
CREATE TYPE message_role AS ENUM ('user', 'interviewer', 'system');
CREATE TYPE document_type AS ENUM ('resume', 'company', 'job_description', 'portfolio');
CREATE TYPE pass_status AS ENUM ('pass', 'borderline', 'fail');

-- ============================================
-- Profiles Table (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  job_type TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Documents Table (for RAG)
-- ============================================
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type document_type NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX documents_embedding_idx ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index for BM25-style search
ALTER TABLE documents ADD COLUMN content_tsv TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('korean', content)) STORED;
CREATE INDEX documents_content_tsv_idx ON documents USING GIN (content_tsv);

-- RLS for documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Interview Sessions Table
-- ============================================
CREATE TABLE interview_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_type TEXT NOT NULL,
  industry TEXT,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  resume_doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  company_doc_ids UUID[] DEFAULT '{}',
  status session_status NOT NULL DEFAULT 'waiting',
  turn_count INT NOT NULL DEFAULT 0,
  max_turns INT NOT NULL DEFAULT 10,
  timer_config JSONB DEFAULT '{"default_time_limit": 120, "warning_threshold": 30, "auto_submit_on_timeout": true}'::JSONB,
  current_interviewer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying user sessions
CREATE INDEX interview_sessions_user_id_idx ON interview_sessions(user_id);
CREATE INDEX interview_sessions_status_idx ON interview_sessions(status);
CREATE INDEX interview_sessions_created_at_idx ON interview_sessions(created_at DESC);

-- RLS for interview_sessions
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Messages Table
-- ============================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE NOT NULL,
  role message_role NOT NULL,
  interviewer_id TEXT,
  content TEXT NOT NULL,
  structured_response JSONB,
  audio_url TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying messages by session
CREATE INDEX messages_session_id_idx ON messages(session_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);

-- RLS for messages (through session ownership)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session messages"
  ON messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM interview_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions"
  ON messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM interview_sessions WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Interview Results Table
-- ============================================
CREATE TABLE interview_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  overall_score NUMERIC(5, 2) NOT NULL,
  pass_status pass_status NOT NULL,
  interviewer_scores JSONB NOT NULL,
  competency_scores JSONB NOT NULL,
  rank_percentile NUMERIC(5, 2),
  growth_index NUMERIC(5, 2),
  feedback_summary TEXT NOT NULL,
  strengths TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX interview_results_user_id_idx ON interview_results(user_id);
CREATE INDEX interview_results_overall_score_idx ON interview_results(overall_score DESC);
CREATE INDEX interview_results_created_at_idx ON interview_results(created_at DESC);

-- RLS for interview_results
ALTER TABLE interview_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results"
  ON interview_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert results"
  ON interview_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Emotion Analyses Table
-- ============================================
CREATE TABLE emotion_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  result_id UUID REFERENCES interview_results(id) ON DELETE CASCADE NOT NULL UNIQUE,
  timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
  average_scores JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for emotion_analyses
ALTER TABLE emotion_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emotion analyses"
  ON emotion_analyses FOR SELECT
  USING (
    result_id IN (
      SELECT id FROM interview_results WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Speech Analytics Table
-- ============================================
CREATE TABLE speech_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  result_id UUID REFERENCES interview_results(id) ON DELETE CASCADE NOT NULL UNIQUE,
  words_per_minute NUMERIC(5, 2) NOT NULL,
  filler_words JSONB NOT NULL DEFAULT '[]'::JSONB,
  silence_patterns JSONB NOT NULL,
  articulation_score NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for speech_analytics
ALTER TABLE speech_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own speech analytics"
  ON speech_analytics FOR SELECT
  USING (
    result_id IN (
      SELECT id FROM interview_results WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Questions Bank Table
-- ============================================
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL,
  job_type TEXT,
  industry TEXT,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  question_text TEXT NOT NULL,
  evaluation_points TEXT[] NOT NULL DEFAULT '{}',
  sample_answer TEXT,
  follow_ups TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for questions
CREATE INDEX questions_category_idx ON questions(category);
CREATE INDEX questions_job_type_idx ON questions(job_type);
CREATE INDEX questions_difficulty_idx ON questions(difficulty);

-- Questions are public read
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Utility Functions
-- ============================================

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search function (Vector + BM25)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_count INT,
  vector_weight FLOAT DEFAULT 0.6,
  bm25_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      1 - (d.embedding <=> query_embedding) AS vector_score,
      ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding) AS vector_rank
    FROM documents d
    WHERE d.embedding IS NOT NULL
    LIMIT match_count * 2
  ),
  bm25_results AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      ts_rank_cd(d.content_tsv, plainto_tsquery('korean', query_text)) AS bm25_score,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(d.content_tsv, plainto_tsquery('korean', query_text)) DESC) AS bm25_rank
    FROM documents d
    WHERE d.content_tsv @@ plainto_tsquery('korean', query_text)
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, b.id) AS id,
      COALESCE(v.content, b.content) AS content,
      COALESCE(v.metadata, b.metadata) AS metadata,
      (
        COALESCE(v.vector_score, 0) * vector_weight +
        COALESCE(b.bm25_score, 0) * bm25_weight
      ) AS combined_score
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.id = b.id
  )
  SELECT c.id, c.content, c.metadata, c.combined_score
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- Get user rank percentile
CREATE OR REPLACE FUNCTION get_user_rank_percentile(
  p_user_id UUID,
  p_job_type TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  user_score NUMERIC;
  total_users INT;
  users_below INT;
BEGIN
  -- Get user's latest score
  SELECT overall_score INTO user_score
  FROM interview_results ir
  JOIN interview_sessions s ON ir.session_id = s.id
  WHERE ir.user_id = p_user_id
    AND s.job_type = p_job_type
  ORDER BY ir.created_at DESC
  LIMIT 1;

  IF user_score IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count total users with same job type
  SELECT COUNT(DISTINCT ir.user_id) INTO total_users
  FROM interview_results ir
  JOIN interview_sessions s ON ir.session_id = s.id
  WHERE s.job_type = p_job_type;

  -- Count users with lower scores
  SELECT COUNT(DISTINCT ir.user_id) INTO users_below
  FROM interview_results ir
  JOIN interview_sessions s ON ir.session_id = s.id
  WHERE s.job_type = p_job_type
    AND ir.overall_score < user_score;

  RETURN ROUND((users_below::NUMERIC / total_users::NUMERIC) * 100, 2);
END;
$$;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Seed Initial Questions
-- ============================================
INSERT INTO questions (category, difficulty, question_text, evaluation_points, follow_ups) VALUES
-- Self Introduction
('self_introduction', 'easy', '간단하게 자기소개 부탁드립니다.',
  ARRAY['명확한 소개', '관련 경험 언급', '지원 동기 연결'],
  ARRAY['어떤 계기로 이 분야에 관심을 갖게 되셨나요?']),

('self_introduction', 'medium', '본인의 강점과 그것이 이 포지션에 어떻게 도움이 될지 설명해주세요.',
  ARRAY['자기 인식', '직무 이해', '구체적 예시'],
  ARRAY['반대로 본인의 약점은 무엇이라고 생각하시나요?']),

-- Technical
('technical', 'easy', '가장 자신있는 프로그래밍 언어와 그 이유를 설명해주세요.',
  ARRAY['기술 이해도', '실무 경험', '학습 의지'],
  ARRAY['해당 언어로 가장 복잡한 문제를 해결한 경험이 있으신가요?']),

('technical', 'medium', '최근에 진행한 프로젝트의 기술 스택과 아키텍처를 설명해주세요.',
  ARRAY['시스템 이해', '기술 선택 이유', '트레이드오프 인식'],
  ARRAY['다시 프로젝트를 진행한다면 어떤 부분을 다르게 하시겠어요?']),

('technical', 'hard', '대용량 트래픽을 처리하기 위한 시스템 설계 경험이 있으신가요?',
  ARRAY['스케일링 이해', '실무 경험', '문제 해결 능력'],
  ARRAY['구체적으로 어떤 병목 현상이 있었고 어떻게 해결하셨나요?']),

-- Behavioral
('behavioral', 'easy', '팀 프로젝트에서 본인의 역할은 주로 어떤 편인가요?',
  ARRAY['팀워크', '자기 인식', '협업 능력'],
  ARRAY['팀원과 의견 충돌이 있었던 경험은요?']),

('behavioral', 'medium', '가장 도전적이었던 프로젝트와 어떻게 극복했는지 말씀해주세요.',
  ARRAY['문제 해결 과정', '끈기', '학습 능력'],
  ARRAY['그 경험에서 가장 크게 배운 점은 무엇인가요?']),

('behavioral', 'hard', '프로젝트 일정이 촉박한 상황에서 팀원이 업무를 제대로 수행하지 못할 때 어떻게 대처하시나요?',
  ARRAY['리더십', '커뮤니케이션', '문제 해결'],
  ARRAY['실제로 그런 상황을 경험하셨다면 구체적으로 말씀해주세요.']),

-- Situational
('situational', 'medium', '만약 상사가 기술적으로 잘못된 결정을 내렸다면 어떻게 하시겠어요?',
  ARRAY['커뮤니케이션', '문제 해결', '조직 이해'],
  ARRAY['실제로 비슷한 상황을 경험하신 적 있으신가요?']),

-- Motivation
('motivation', 'easy', '왜 저희 회사에 지원하셨나요?',
  ARRAY['회사 이해', '동기 진정성', '비전 연결'],
  ARRAY['5년 후 본인의 모습은 어떨 것 같으세요?']),

-- Culture Fit
('culture_fit', 'medium', '이상적인 팀 문화는 어떤 것이라고 생각하시나요?',
  ARRAY['팀워크 이해', '가치관', '문화 적합성'],
  ARRAY['그런 문화를 만들기 위해 본인이 기여할 수 있는 부분은요?']);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
