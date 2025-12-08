# Semantic Versioning Guide

이 프로젝트는 [Semantic Versioning 2.0.0](https://semver.org/lang/ko/)을 따릅니다.

## Version Format

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: 하위 호환성이 깨지는 API 변경
- **MINOR**: 하위 호환성을 유지하면서 기능 추가
- **PATCH**: 하위 호환성을 유지하면서 버그 수정

## Commit Message Convention

이 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/ko/)를 따릅니다.

### Commit Types

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | 새로운 기능 추가 | MINOR |
| `fix` | 버그 수정 | PATCH |
| `docs` | 문서 변경 | - |
| `style` | 코드 포맷팅, 세미콜론 누락 등 | - |
| `refactor` | 코드 리팩토링 | - |
| `perf` | 성능 개선 | PATCH |
| `test` | 테스트 추가/수정 | - |
| `chore` | 빌드 설정, 패키지 매니저 설정 등 | - |
| `ci` | CI 설정 변경 | - |

### Breaking Changes

하위 호환성이 깨지는 변경사항은 다음과 같이 표시합니다:

```
feat!: 사용자 인증 API 변경

BREAKING CHANGE: 기존 인증 토큰 형식이 변경되었습니다.
```

또는

```
feat(auth): 인증 방식 변경

BREAKING CHANGE: OAuth2에서 JWT로 변경
```

## Release Workflow

### 1. 버전 업데이트

```bash
# Patch 릴리스 (버그 수정)
npm run version:patch

# Minor 릴리스 (새 기능)
npm run version:minor

# Major 릴리스 (Breaking Changes)
npm run version:major
```

### 2. Changelog 생성

```bash
# 마지막 버전 이후 변경사항만 추가
npm run changelog

# 전체 히스토리 재생성
npm run changelog:all
```

### 3. Tag 기반 배포

```bash
# 태그 생성 및 푸시
git tag v1.2.3
git push origin v1.2.3

# 또는 npm version 사용 시 자동으로 태그가 생성됨
npm run version:patch && git push --follow-tags
```

## Tag Naming Convention

- Release: `v1.0.0`, `v1.1.0`, `v2.0.0`
- Pre-release: `v1.0.0-alpha.1`, `v1.0.0-beta.1`, `v1.0.0-rc.1`

## Branch Strategy

```
main (production)
  |
  +-- develop (staging)
        |
        +-- feature/feature-name
        +-- fix/bug-description
        +-- release/v1.2.0
        +-- hotfix/critical-fix
```

### Release Process

1. `develop` 브랜치에서 `release/vX.Y.Z` 브랜치 생성
2. 버전 번호 업데이트 (`npm run version:*`)
3. Changelog 생성 (`npm run changelog`)
4. PR 생성 및 리뷰
5. `main`으로 머지
6. 태그 생성 및 푸시
7. CI/CD 파이프라인에서 자동 배포

## Automated Release (GitHub Actions)

`.github/workflows/release.yml`에서 태그 푸시 시 자동 배포를 설정할 수 있습니다:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      # Deploy steps...
```

## Pre-commit Hooks

이 프로젝트는 코드 품질을 위해 다음 pre-commit hooks를 사용합니다:

- **ESLint**: TypeScript/JavaScript 린팅 및 자동 수정
- **Prettier**: 코드 포맷팅

hooks는 `lint-staged`를 통해 staged 파일에만 적용됩니다.

## Quick Reference

```bash
# 일반적인 커밋
git commit -m "feat: 새로운 면접 질문 유형 추가"
git commit -m "fix: 로그인 오류 수정"
git commit -m "docs: README 업데이트"

# Breaking Change 커밋
git commit -m "feat!: API 응답 형식 변경"

# 릴리스
npm run version:minor
npm run changelog
git push --follow-tags
```
