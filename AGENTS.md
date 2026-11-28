# AGENTS.md — 팀 공통 규칙

## 프로젝트 개요

pnpm 워크스페이스 모노레포. 초이돌상(choidolsang) 서비스와 굿플레이스(goodplace) 운영 도구를 함께 관리한다.

## 도메인

| 도메인                  | 앱                      | 용도                                             |
| ----------------------- | ----------------------- | ------------------------------------------------ |
| `choidolsang.com`       | `apps/choidolsang-web`  | 초이돌상 고객용 서비스                           |
| `admin.choidolsang.com` | `apps/backoffice`       | 로그인 화면에서 서비스 탭을 골라 `/choidolsang` 또는 `/goodplace` 백오피스로 로그인 |
| `api.choidolsang.com`   | `apps/backend`          | 공통 REST API                                    |

## 구조

```bash
apps/choidolsang-web/  # Next.js (초이돌상 고객 UI, REST API 소비자)
apps/backoffice/       # Next.js (초이돌상·굿플레이스 운영자 UI, 경로로 서비스 분기)
apps/backend/          # NestJS (REST API, 비즈니스 로직, PostgreSQL)
packages/api-contract/ # OpenAPI 스펙 & 생성 타입
packages/shared/       # 공통 타입/유틸 (비즈니스 로직 금지)
docs/adr/              # 아키텍처 의사결정 기록
```

## 핵심 규칙

- 프론트/백엔드는 REST API(OpenAPI 계약)로만 통신. 앱 간 직접 import 금지.
- 초이돌상과 굿플레이스는 DB에서 PostgreSQL 스키마(`choidolsang`, `goodplace`)로 논리적으로 분리한다.
  - 각 서비스의 테이블은 자기 스키마에 둔다 (Prisma `@@schema`).
  - 두 스키마의 테이블끼리 관계(외래키)를 맺지 않는다.
  - 관리자 계정과 세션도 서비스마다 따로 있다. 한 계정으로 두 서비스에 로그인하지 않는다.
- 백오피스의 서비스 분기(`/choidolsang`, `/goodplace`) 접근 권한은 반드시 백엔드에서 강제한다.
  프론트의 경로 가드는 UX용일 뿐 보안 경계가 아니다.
- 코드 포맷/린트: Biome (single quotes, 2-space indent, 100자, trailing commas)
- shared 패키지: 2곳 이상 중복 확인 후에만 승격. 비즈니스 로직 금지.
- 보안/인증/결제/데이터 삭제 로직은 AI 제안만 참고하고 사람이 확정.

## 에셋 관리

| 종류   | 위치                          | 규칙                                                         |
| ------ | ----------------------------- | ------------------------------------------------------------ |
| 아이콘 | `apps/<앱>/public/icons/*.svg` | kebab-case 파일명, `viewBox="0 0 24 24"`, 단색 선(stroke) 아이콘 |
| 이미지 | `apps/<앱>/public/images/`    | 화면에서 쓰는 배포용 이미지                                  |

- 아이콘·이미지 SVG를 컴포넌트 코드에 직접 넣지 않는다. 반드시 파일로 추가한다.
- 아이콘은 `<Icon name="..." />`(`src/components/icon.tsx`)로 쓴다. 파일을 CSS 마스크로 써서
  글자색을 따라가므로, 색은 `text-*` 클래스로 바꾼다. 새 아이콘은 파일을 추가하고
  `ICON_NAMES`에 이름을 등록한다.
- 아이콘만 있는 버튼에는 `aria-label`을 단다.
- 에셋을 교체하면 모든 사용처를 새 파일로 바꾸고, 쓰지 않는 이전 파일은 지운다.

## 로컬 포트

| 앱                | 주소                    |
| ----------------- | ----------------------- |
| choidolsang-web   | `http://127.0.0.1:4000` |
| backend           | `http://127.0.0.1:4001` |
| backoffice        | `http://127.0.0.1:4002` |
| PostgreSQL        | `127.0.0.1:5433`        |

## 작업 프로세스

1. **Issue 생성**: GitHub Issue 작성 (목표, 범위, 수락 기준 포함)
2. **브랜치 생성**: `feat/이슈번호-설명` 또는 `fix/이슈번호-설명`
3. **구현**: AGENTS.md 공통 규칙을 준수하며 작은 단위로 커밋.
4. **검증**: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` 통과 확인.
5. **PR 생성**: `dev`를 대상으로 PR을 만든다. `Closes #이슈번호`로 Issue에 연결, PR 템플릿 준수.
6. **리뷰**: 사람이 직접 리뷰 후 머지.
7. **문서 최신화**: PR 머지 후 README.md 등 영향받는 문서 갱신.

## 브랜치 규칙

| 브랜치     | 역할                                  |
| ---------- | ------------------------------------- |
| `main`     | 운영 배포 브랜치                      |
| `dev`      | 개발 통합 브랜치. 모든 작업 PR의 대상 |
| 작업 브랜치 | `dev`에서 분기한 기능/수정 단위 브랜치 |

- 흐름: 작업 브랜치 → `dev` (PR) → `main` (PR, 운영 반영)
- 작업 브랜치는 항상 최신 `dev`에서 분기한다.
- 브랜치명: `feat/이슈번호-간단설명`, `fix/이슈번호-간단설명`, `chore/간단설명`, `docs/간단설명`
- 작업 브랜치에서 `main`으로 바로 PR/머지하지 않는다. 반드시 `dev`를 거친다.
- `dev`, `main`에 직접 push 금지. 반드시 PR을 통해 머지.
- 운영 반영은 `dev` → `main` PR로만 한다.

## 머지 전 검증

CI는 아직 없다. PR 전에 로컬에서 아래를 모두 통과시킨다.

`pnpm lint → pnpm format:check → pnpm typecheck → pnpm test → pnpm build`

## 커밋 메시지

conventional commits 형식 사용:

- `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

## ADR

- 아키텍처/운영 정책/API 계약/DB 스키마 변경 시 ADR 작성.
- 위치: `docs/adr/ADR-XXXX-제목.md` (템플릿: `docs/templates/adr-template.md`)
- PR 본문에 ADR 파일 경로 연결.

## AI 에이전트 팀

Claude Code에서 soine 작업은 네 역할로 나눈다. 하위 에이전트 정의는 `.claude/agents/`에 있다.

| 역할      | 에이전트      | 맡는 일                                                                  |
| --------- | ------------- | ------------------------------------------------------------------------ |
| 팀장      | 메인 에이전트 | 사용자와 대화, 일 나누기, 결과 검토, 커밋·푸시·PR(사용자 허락 후)         |
| 기획      | `planner`     | Issue 작성, 업무 흐름·용어·정책 설계, ADR 초안. 코드 수정 안 함           |
| UI/UX 디자인 | `designer` | 화면 구성·시각 위계·상호작용·반응형 설계, `docs/design/` 시안. 코드 수정 안 함 |
| 개발      | `developer`   | 구현, lint·format·typecheck·test 검증. 커밋·PR 안 함                      |

- 흐름: 사용자 요청 → 팀장 → 기획(Issue·규칙) → 디자인(화면) → 사용자 확인 → 개발(구현·검증) → 팀장 검토 → 사용자 허락 후 커밋·PR.
- 작은 수정은 팀장이 직접 해도 된다. 새 기능, 정책·스키마 변경은 기획을, 새 화면이나 화면 개편은 디자인을 거친다.
- UI 설계와 디자인은 디자인팀이 맡는다. 개발팀은 디자인팀 명세·시안대로 구현하고, 명세와 다르게 만들어야 하면
  임의로 바꾸지 말고 팀장을 거쳐 디자인팀에 확인한다.
- 하위 에이전트는 사용자와 직접 이야기하지 않는다. 결정이 필요하면 팀장이 사용자에게 묻는다.
- 개발 서버 켜기·끄기, 화면 확인은 팀장이 한다.

## AI 사용 규칙

- AI 생성 코드는 사람이 최종 검토/책임진다.
- PR에 AI 사용 내역(도구, 생성 범위, 검토 포인트)을 반드시 기록.
- 프롬프트에는 목표, 제약조건, 수정 허용 파일, 금지사항, 완료조건을 포함.
