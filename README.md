# soine

초이돌상(choidolsang) 서비스와 굿플레이스(goodplace) 운영 도구를 담은 모노레포입니다.

## 구조

```txt
apps/
  choidolsang-web/   # Next.js — choidolsang.com (고객용)
  backoffice/        # Next.js — admin.choidolsang.com (/choidolsang, /goodplace)
  backend/           # NestJS — api.choidolsang.com
packages/
  api-contract/      # OpenAPI 스펙/생성 타입
  shared/            # 공통 타입/유틸(비즈니스 로직 금지)
docs/
  adr/               # 의사결정 기록(ADR)
  templates/         # 문서 템플릿
.github/             # PR/Issue 템플릿
```

## 기술 스택

- pnpm 10 workspace, Node 22
- Next.js 16, React 19, Tailwind CSS 4
- NestJS 11, Prisma 7, PostgreSQL 17
- Biome 2 (lint/format)

## 로컬 실행

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
pnpm db:up            # PostgreSQL (127.0.0.1:5433)
pnpm db:migrate       # Prisma 마이그레이션
pnpm dev              # choidolsang-web(4000), backend(4001), backoffice(4002)
```

개별 실행:

```bash
pnpm dev:choidolsang-web
pnpm dev:backoffice
pnpm dev:backend
```

## 검증

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

## 브랜치 흐름

```txt
작업 브랜치 (feat/*, fix/*, chore/*, docs/*)
  → dev   (개발 통합, PR로 머지)
  → main  (운영, dev → main PR로만 반영)
```

## 문서

1. 팀 규칙: `AGENTS.md`
2. 의사결정: `docs/adr/`
3. PR 템플릿: `.github/pull_request_template.md`
