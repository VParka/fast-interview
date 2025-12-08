# 개발/프로덕션 환경 분리 가이드

이 문서는 IMSAM AI Interview 서비스의 개발 환경과 프로덕션 환경을 분리하여 운영하는 방법을 설명합니다.

## 목차

1. [환경 개요](#환경-개요)
2. [Supabase 프로젝트 설정](#supabase-프로젝트-설정)
3. [환경 변수 관리](#환경-변수-관리)
4. [데이터베이스 마이그레이션 전략](#데이터베이스-마이그레이션-전략)
5. [Edge Functions 배포](#edge-functions-배포)
6. [CI/CD 파이프라인](#cicd-파이프라인)
7. [데이터 백업 및 복원](#데이터-백업-및-복원)

---

## 환경 개요

### 권장 환경 구성

| 환경 | 용도 | Supabase 프로젝트 |
|------|------|------------------|
| Local | 로컬 개발 | Supabase CLI (Docker) |
| Development | 개발/테스트 | dev-fast-interview |
| Staging | QA/스테이징 | staging-fast-interview |
| Production | 실 서비스 | fast-interview |

### 환경별 특성

```
Local (localhost)
├── Supabase CLI로 로컬 Docker 실행
├── 시드 데이터로 테스트
└── 빠른 개발 사이클

Development (dev.aiiv.site)
├── 실제 Supabase 프로젝트 (무료 티어 가능)
├── 테스트 데이터
└── 기능 개발 및 통합 테스트

Staging (staging.aiiv.site)
├── 프로덕션과 동일한 구성
├── 프로덕션 데이터의 익명화된 복사본
└── 배포 전 최종 검증

Production (aiiv.site)
├── 실제 사용자 데이터
├── 높은 가용성 설정
└── 모니터링 및 알림 활성화
```

---

## Supabase 프로젝트 설정

### 1. 새 프로젝트 생성

각 환경별로 별도의 Supabase 프로젝트를 생성합니다:

```bash
# Supabase 대시보드에서 프로젝트 생성
# https://supabase.com/dashboard

# 프로젝트 생성 후 각 환경별 링크 설정
# Development
supabase link --project-ref <dev-project-ref>

# Staging
supabase link --project-ref <staging-project-ref>

# Production (현재 설정됨)
supabase link --project-ref whczodrinaeeemwncfze
```

### 2. 프로젝트 설정 파일 구조

```
supabase/
├── config.toml              # 기본 설정 (로컬)
├── config.development.toml  # 개발 환경 오버라이드
├── config.staging.toml      # 스테이징 환경 오버라이드
├── config.production.toml   # 프로덕션 환경 오버라이드
├── migrations/              # 데이터베이스 마이그레이션
├── functions/               # Edge Functions
└── seed.sql                 # 시드 데이터
```

### 3. 환경별 config.toml 예시

**config.development.toml:**
```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]

[auth.email]
enable_confirmations = false  # 개발 환경에서는 이메일 확인 비활성화
```

**config.production.toml:**
```toml
[auth]
site_url = "https://aiiv.site"
additional_redirect_urls = ["https://aiiv.site/auth/callback", "https://www.aiiv.site/auth/callback"]

[auth.email]
enable_confirmations = true  # 프로덕션에서는 이메일 확인 활성화
```

---

## 환경 변수 관리

### 1. 환경별 .env 파일

```bash
# .env.local (로컬 개발 - Git 무시)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
OPENAI_API_KEY=<your-openai-key>

# .env.development (개발 서버)
NEXT_PUBLIC_SUPABASE_URL=https://dev-xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<dev-service-key>
OPENAI_API_KEY=<your-openai-key>

# .env.production (프로덕션)
NEXT_PUBLIC_SUPABASE_URL=https://whczodrinaeeemwncfze.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-key>
OPENAI_API_KEY=<your-openai-key>
```

### 2. Vercel 환경 변수 설정

```bash
# Vercel CLI로 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_URL development

# 또는 Vercel 대시보드에서 설정:
# Project Settings > Environment Variables
```

### 3. 환경 변수 검증 스크립트

**scripts/validate-env.ts:**
```typescript
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
];

const optionalEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEEPGRAM_API_KEY',
];

function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    process.exit(1);
  }

  console.log('Environment validation passed!');
}

validateEnv();
```

---

## 데이터베이스 마이그레이션 전략

### 1. 마이그레이션 워크플로우

```bash
# 1. 로컬에서 마이그레이션 생성
supabase migration new add_feature_x

# 2. 마이그레이션 파일 작성
# supabase/migrations/xxx_add_feature_x.sql

# 3. 로컬에서 테스트
supabase db reset  # 로컬 DB 리셋 및 마이그레이션 적용

# 4. 개발 환경에 적용
supabase db push --linked --project-ref <dev-ref>

# 5. 스테이징 환경에 적용
supabase db push --linked --project-ref <staging-ref>

# 6. 프로덕션에 적용 (신중하게!)
supabase db push --linked --project-ref <prod-ref>
```

### 2. 마이그레이션 명명 규칙

```
NNN_description.sql

예시:
001_initial_schema.sql
002_add_portfolio_doc_id.sql
003_add_user_keywords.sql
...
```

### 3. 롤백 전략

각 마이그레이션에 대한 롤백 스크립트 작성:

```
supabase/
├── migrations/
│   ├── 006_dashboard_analytics_functions.sql
│   └── rollback/
│       └── 006_dashboard_analytics_functions_rollback.sql
```

**롤백 예시:**
```sql
-- 006_dashboard_analytics_functions_rollback.sql
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS get_interview_history(UUID, INT, INT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_score_trends(UUID, INT, TEXT);
-- ... etc
```

### 4. Zero-Downtime 마이그레이션

```sql
-- Bad: 프로덕션에서 테이블 잠금 발생
ALTER TABLE interview_results ADD COLUMN new_field TEXT NOT NULL;

-- Good: 기본값으로 먼저 추가 후 나중에 NOT NULL 설정
ALTER TABLE interview_results ADD COLUMN new_field TEXT DEFAULT '';
-- (앱 업데이트 후)
ALTER TABLE interview_results ALTER COLUMN new_field SET NOT NULL;
```

---

## Edge Functions 배포

### 1. Edge Functions 구조

```
supabase/functions/
├── auto-score/
│   └── index.ts
├── generate-report/
│   └── index.ts
├── update-rankings/
│   └── index.ts
└── _shared/           # 공유 유틸리티
    ├── cors.ts
    └── supabase.ts
```

### 2. 환경별 배포

```bash
# 개발 환경에 배포
supabase functions deploy auto-score --project-ref <dev-ref>

# 프로덕션에 배포
supabase functions deploy auto-score --project-ref <prod-ref>

# 모든 함수 배포
supabase functions deploy --project-ref <ref>
```

### 3. Edge Functions 환경 변수

```bash
# Supabase 대시보드 또는 CLI로 설정
supabase secrets set OPENAI_API_KEY=<key> --project-ref <ref>

# 여러 환경 변수 한번에 설정
supabase secrets set --env-file .env.production --project-ref <ref>
```

### 4. Edge Functions 테스트

```bash
# 로컬 테스트
supabase functions serve auto-score --env-file .env.local

# 원격 함수 호출 테스트
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/auto-score' \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-session-id"}'
```

---

## CI/CD 파이프라인

### GitHub Actions 워크플로우

**.github/workflows/deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches:
      - main        # Production
      - develop     # Development
      - staging     # Staging

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Set environment
        id: set-env
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "env=production" >> $GITHUB_OUTPUT
            echo "supabase_ref=${{ secrets.SUPABASE_PROD_REF }}" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" = "refs/heads/staging" ]; then
            echo "env=staging" >> $GITHUB_OUTPUT
            echo "supabase_ref=${{ secrets.SUPABASE_STAGING_REF }}" >> $GITHUB_OUTPUT
          else
            echo "env=development" >> $GITHUB_OUTPUT
            echo "supabase_ref=${{ secrets.SUPABASE_DEV_REF }}" >> $GITHUB_OUTPUT
          fi

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Database Migrations
        run: |
          supabase link --project-ref ${{ steps.set-env.outputs.supabase_ref }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy Edge Functions
        run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: ${{ steps.set-env.outputs.env == 'production' && '--prod' || '' }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 필요한 GitHub Secrets

```
SUPABASE_ACCESS_TOKEN      # supabase login으로 생성
SUPABASE_DEV_REF           # 개발 프로젝트 reference
SUPABASE_STAGING_REF       # 스테이징 프로젝트 reference
SUPABASE_PROD_REF          # 프로덕션 프로젝트 reference
VERCEL_TOKEN               # Vercel 액세스 토큰
VERCEL_ORG_ID              # Vercel 조직 ID
VERCEL_PROJECT_ID          # Vercel 프로젝트 ID
```

---

## 데이터 백업 및 복원

### 1. 자동 백업 (Supabase Pro 플랜)

Supabase Pro 플랜은 자동 일일 백업을 제공합니다:
- 대시보드 > Settings > Database > Backups

### 2. 수동 백업

```bash
# pg_dump를 사용한 수동 백업
pg_dump -h db.<project-ref>.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Supabase CLI 사용
supabase db dump -f backup.sql --project-ref <ref>
```

### 3. 데이터 복원

```bash
# 특정 백업에서 복원
psql -h db.<project-ref>.supabase.co -U postgres -d postgres < backup.sql

# 또는 Supabase 대시보드에서 Point-in-Time Recovery (Pro 플랜)
```

### 4. 환경 간 데이터 동기화

**개발 환경에 프로덕션 스키마 복제 (데이터 제외):**
```bash
# 스키마만 덤프
pg_dump -h db.<prod-ref>.supabase.co -U postgres -d postgres --schema-only > schema.sql

# 개발 환경에 적용
psql -h db.<dev-ref>.supabase.co -U postgres -d postgres < schema.sql
```

**익명화된 데이터 복제:**
```sql
-- 민감한 정보 익명화 후 복제
INSERT INTO dev_database.profiles
SELECT
  id,
  'user_' || ROW_NUMBER() OVER () || '@example.com' as email,
  'Test User ' || ROW_NUMBER() OVER () as full_name,
  NULL as avatar_url,
  job_type,
  industry,
  created_at,
  updated_at
FROM prod_database.profiles;
```

---

## 체크리스트

### 새 환경 설정 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 마이그레이션 적용
- [ ] Edge Functions 배포
- [ ] 환경 변수 설정
- [ ] OAuth 리다이렉트 URL 설정
- [ ] CORS 설정 확인
- [ ] SSL/TLS 인증서 확인
- [ ] 모니터링 설정

### 프로덕션 배포 전 체크리스트

- [ ] 스테이징에서 전체 테스트 완료
- [ ] 마이그레이션 롤백 스크립트 준비
- [ ] 데이터베이스 백업 완료
- [ ] 성능 테스트 완료
- [ ] 보안 검토 완료
- [ ] 문서 업데이트 완료

---

## 문제 해결

### 일반적인 문제

1. **마이그레이션 충돌**
   ```bash
   supabase migration repair --status reverted <migration-version>
   ```

2. **Edge Function 배포 실패**
   ```bash
   # 로그 확인
   supabase functions logs auto-score --project-ref <ref>
   ```

3. **환경 변수 누락**
   ```bash
   # 설정된 시크릿 확인
   supabase secrets list --project-ref <ref>
   ```

### 지원 리소스

- [Supabase 문서](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/your-org/fast-interview/issues)
