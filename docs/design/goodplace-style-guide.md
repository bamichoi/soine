# 굿플레이스 백오피스 스타일 가이드 (수입 화면 기준)

기준: `components/goodplace-income.tsx`, `components/goodplace-income-parts.tsx` (시안 A 토스식).
범위: `/goodplace/*`, 그리고 같은 모양으로 바꾸는 `/choidolsang/*`. 로그인 화면은 6절(화면 모드 버튼)만 따른다. 헤더·사이드 메뉴는 `AdminShell look="goodplace"`일 때만 5절 모양을 쓴다.
시안: `goodplace-shell.html`(헤더·사이드 메뉴), `goodplace-style-contracts.html`, `goodplace-style-meeting-detail.html`, `goodplace-style-schedule.html`, `goodplace-buttons.html`(버튼·배지).

## 0. 원칙

- 회색 바탕(`--background`) 위에 **테두리 없는 둥근 흰 카드**. 쉴 때 그림자 없음, 누르는 카드만 hover 때 살짝 뜸. (카드 이야기다. 버튼은 선·그림자를 쓴다.)
- 경계는 선보다 **여백과 바탕색 차이**로. 카드 안 구분선은 `border-[var(--line)]/60` 한 종류.
- 글자 위계는 굵기로: 제목 800, 값 700, 라벨 600(회색). 숫자는 `tabular-nums`.
- 색은 새로 만들지 않는다. `globals.css` 토큰과 그 투명도(`/70`, `/35`, `/20`)만 쓴다.
- 클릭되는 것은 모두 `cursor-pointer` + 호버 변화 + 아래 포커스 링. 누를 수 없는 배지·태그는 모양으로 구분한다(4절 구분 원칙).

## 1. 토큰 (globals.css, 그대로)

| 역할 | 토큰 | 쓰는 곳 |
| --- | --- | --- |
| 페이지 바탕, 카드 안 회색 칸 | `--background` #f4f6f9 | body, 알약·태그·입력칸 바탕 |
| 카드 | `--surface` #fff | 카드, 흰 칩 |
| 본문 | `--foreground` #1d2433 | 글자, **눌린 칩·현재 페이지·어두운 버튼 바탕** |
| 보조 글자 | `--muted` #667085 | 라벨, 설명 |
| 옅은 글자 | `--muted` 70% → `text-[var(--muted)]/70` | 번호(코드), 건수, 날짜 |
| 세그먼트 바탕·구분선 | `--line` #d9dee6 | 세그먼트 틀, 칩 사이 세로선 |
| 주 동작 | `--brand` / `--brand-hover` | 주 버튼, 건수 강조, 오늘 |
| 연한 브랜드 | `--brand-soft` | 날짜 배지, 선택 칸 |
| 위험 | `--error` / `--error-soft` | 중단·취소 글자, 오류 |

공통 클래스 (`lib/goodplace-ui.tsx`에 상수로 둔다)

```ts
FOCUS   = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]'
FAINT   = 'text-[var(--muted)]/70'
CARD    = 'rounded-[18px] bg-[var(--surface)]'                // 행 카드, 안내 카드, 표 카드
HERO    = 'rounded-[20px] bg-[var(--surface)] p-5 md:px-8 md:py-7' // 화면 첫 카드(요약·폼·달력)
ROW     = `${CARD} cursor-pointer px-4 py-4 md:px-[22px] transition hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] ${FOCUS}`
```

## 2. 크기·간격

| 항목 | 값 |
| --- | --- |
| 페이지 여백 | `p-4 md:p-8` (지금과 같음). 모바일 좌우 16px, 가로 스크롤 없음 |
| 제목 줄 아래 | `mb-5`, 데스크톱 위 `md:mt-2` |
| 카드와 다음 묶음 머리 사이 | `mt-7 mb-3` |
| 카드끼리(같은 목록) | `gap-2` |
| 상세·폼 폭 | `max-w-4xl` (지금 `max-w-3xl`) |
| 둥근 정도 | 큰 카드 20 / 카드 18 / 알약·날짜배지 16(`rounded-2xl`) / 세그먼트 틀 14 / 버튼·입력·세그먼트 안 10~12 / 태그·배지 6(`rounded-md`) / 칩 full(칩만 씀) |

## 3. 타이포

| 쓰임 | 클래스 |
| --- | --- |
| 화면 제목(h2) | `text-[26px] leading-tight font-extrabold tracking-[-0.02em]` |
| 제목 옆 건수 | `ml-2 text-[17px] font-bold text-[var(--brand)] tabular-nums` |
| 묶음 머리(h3) | `text-[19px] font-extrabold` + 건수 `<em class="ml-1.5 not-italic text-[var(--brand)]">` |
| 카드 안 소제목 | `text-sm font-bold` |
| 큰 숫자(요약) | `text-[36px] md:text-[44px] leading-[1.15] font-extrabold tracking-[-0.03em]`, 단위 `<small class="text-[22px] md:text-[26px] font-bold">`. **수입 같은 요약 화면에만.** 상세 화면에는 쓰지 않는다 |
| 라벨 | `text-[13px] font-semibold text-[var(--muted)]` |
| 값 | `text-[15px] font-semibold` (금액은 `font-bold tabular-nums`) |
| 행 제목 | `text-base font-bold`, 행 설명 `text-sm text-[var(--muted)]` |
| 코드(번호) | `font-mono text-xs font-medium ${FAINT}` + `translate="no"` |

## 4. 컴포넌트

### 제목 줄 `GoodplacePageHead` (새, `PageTitleBar` 대신)
`flex flex-wrap items-end justify-between gap-3 mb-5 md:mt-2`
왼쪽 h2(+건수), 오른쪽 컨트롤(세그먼트·기간 이동·버튼). 모바일은 오른쪽이 `w-full` 다음 줄.
모바일의 `BackToListLink`는 제목 위 한 줄(`mb-2`)로 둔다.

### 세그먼트 (월별|연간 같은 2~3개 전환)
- 틀: `inline-flex rounded-[14px] bg-[var(--line)] p-1` (`fieldset` + `aria-label`)
- 버튼: `rounded-[10px] px-4 py-[7px] text-sm font-bold cursor-pointer`
- 눌림: `bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]`, 아님: `text-[var(--muted)] hover:bg-[var(--surface)]/50 hover:text-[var(--foreground)]`, `aria-pressed`
- 공통 `transition`. 회색 틀 안에 있으므로 버튼(선·그림자)·칩(알약)과 헷갈리지 않는다.

### 기간 이동
- 틀: `inline-flex items-center gap-1 rounded-[14px] bg-[var(--surface)] p-1`
- 화살표: `grid size-[34px] place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 disabled:pointer-events-none disabled:opacity-40`, `aria-label="이전 달"` 등
- 가운데: `min-w-[116px] text-center text-[15px] font-bold tabular-nums`, `aria-live="polite"`

### 배지·칩·버튼 구분 원칙
시안: `goodplace-buttons.html` (지금 vs 새, 종류별 상태 표).

누를 수 없는 것(배지·태그)과 누르는 것(버튼·칩·세그먼트)은 **색이 아니라 모양**으로 구분한다.

| | 배지·태그 (누를 수 없음) | 칩 (하나 고르기) | 버튼 (동작) |
| --- | --- | --- | --- |
| 높이 | 22px | 36px | 40px (작은 32px) |
| 모서리 | 6px `rounded-md` | full (칩만 쓴다) | 12px / 작은 10px |
| 선·그림자 | 없음 | 쉴 때 없음, 호버 때 안쪽 선 | 채움 또는 1px 선 + 옅은 그림자 |
| 글자 | 12px 600, 배지는 앞에 점 | 14px 600 | 14px 700 / 작은 13px 600 |
| 커서 | `cursor-default` | `cursor-pointer` | `cursor-pointer` |
| 호버·누름 | 없음 | 글자 진해짐 + 안쪽 선 | 바탕·선·그림자 변화, 누르면 1px 내려감 |

- **모든 버튼·칩·세그먼트에 호버가 있다.** 호버 없는 클릭 요소를 만들지 않는다.
- 배지 모양(옅은 바탕 납작한 사각)을 버튼에 쓰지 않는다. 버튼 모양(선·그림자)을 배지에 쓰지 않는다.
- `rounded-full` + 어두운 바탕은 **눌린 칩** 전용이다. 버튼에 쓰지 않는다.

### 칩 (필터)
`chipClassName(pressed, place)`
- 공통: `inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap cursor-pointer transition` + FOCUS
- 아님(회색 바탕 위 `page`): `bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:shadow-[inset_0_0_0_1px_var(--line)]`
- 아님(흰 카드 안 `card`): `bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--line)]/60 hover:text-[var(--foreground)]`
- 눌림: `bg-[var(--foreground)] text-[var(--surface)] hover:bg-[var(--foreground)]/90`
- 건수: `ml-1 font-bold tabular-nums` (눌림 `text-[var(--line)]`, 아님 FAINT)
- 묶음: `fieldset aria-label="상태"` + `flex gap-2`, 묶음 사이 `h-5 w-px bg-[var(--line)] mx-1`
- 하나만 고르는 필터(상태 등)·폼의 여러 개 중 하나에 쓴다. 눌림은 색 + `aria-pressed`로 함께 알린다.
- 칩에는 그림자·바깥 선을 두지 않는다(버튼과 구분).

### 버튼

공통 바탕 `BUTTON_BASE` (모든 버튼):
`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none` + FOCUS

크기:
- 보통 `MD`: `h-10 rounded-xl px-4 text-sm font-bold`
- 작은 `SM`: `h-8 rounded-[10px] px-3 text-[13px] font-semibold`

| 종류 | 상수 | 기본 | 호버 | 누름 |
| --- | --- | --- | --- | --- |
| 주 | `PRIMARY` (MD) | `border-transparent bg-[var(--brand)] text-white shadow-[0_1px_2px_rgba(16,24,40,0.12),inset_0_-1px_0_rgba(0,0,0,0.16)]` | `hover:bg-[var(--brand-hover)] hover:shadow-[0_4px_12px_rgba(9,78,163,0.28)]` | `active:bg-[var(--brand-strong)] active:shadow-none` |
| 보조 | `SECONDARY` (MD) | `border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]` | `hover:border-[var(--muted)]/45 hover:bg-[var(--background)] hover:shadow-[0_2px_6px_rgba(16,24,40,0.10)]` | `active:bg-[var(--line)]/50 active:shadow-none` |
| 위험 | `DANGER` (MD) | `border-[var(--error)]/30 bg-[var(--surface)] text-[var(--error)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]` | `hover:border-[var(--error)]/60 hover:bg-[var(--error-soft)] hover:shadow-[0_2px_6px_rgba(180,35,24,0.12)]` | `active:bg-[var(--error)]/10 active:shadow-none` |
| 위험 확인(모달) | `DANGER_PRIMARY` (MD) | `border-transparent bg-[var(--error)] text-white` + 주와 같은 그림자 | `hover:bg-[var(--error)]/90 hover:shadow-[0_4px_12px_rgba(180,35,24,0.28)]` | `active:brightness-90 active:shadow-none` |
| 작은 보조 | `SMALL` (SM) | 보조와 같은 색 | 보조와 같음 | 보조와 같음 |
| 줄 안 동작 | `ROW_ACTION` (SM) | `pr-2 font-bold border-[var(--brand)]/35 bg-[var(--surface)] text-[var(--brand)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]` + 끝에 `<Icon name="chevron-right" className="size-3.5 transition group-hover:translate-x-0.5" />`, 바탕에 `group` | `hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]` | `active:bg-[var(--brand)]/15 active:shadow-none` |

- 보조 버튼은 흰 바탕 + 선이라 **회색 바탕 위·흰 카드 안 모두 같은 상수**를 쓴다(`*_IN_CARD` 구분 없앰).
- 포커스: 모두 FOCUS 링(`focus-visible:outline-2 outline-offset-2 outline-[var(--brand)]`).
- 비활성: `disabled:` 클래스는 `button`에만 걸린다. 링크(`Link`)는 비활성으로 두지 말고 아예 숨긴다.
- 제목 줄 순서: 보조 → 위험 → 주, `gap-2`. 한 화면의 주 버튼은 하나.
- 줄 안 동작(미팅 매물의 '계약 진행' 등)은 `ROW_ACTION`만 쓴다. 배지 열 옆에 있어도 선·그림자·화살표로 구분된다.
- 아이콘 동반: 버튼 앞 아이콘 `size-4`(작은 `size-3.5`), 글자와 `gap-1.5`. 쓰는 곳은 팀장 결정(지금은 줄 안 동작의 화살표만).

아이콘·글자 버튼 (선·그림자 없음, 대신 호버 바탕/밑줄):

| 종류 | 상수 | 클래스 |
| --- | --- | --- |
| 아이콘만(⋮·복사·닫기) | `ICON_BUTTON` | `grid size-8 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] active:bg-[var(--line)]/70 aria-expanded:bg-[var(--background)] aria-expanded:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40` + FOCUS, `aria-label` 필수 |
| 글자(수정·닫기·검색 초기화) | `TEXT_BUTTON` | `shrink-0 cursor-pointer rounded-md text-[13px] font-semibold whitespace-nowrap text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline active:opacity-70 disabled:pointer-events-none disabled:opacity-45` + FOCUS |
| 검색(필터 바 안) | — | `h-9 rounded-[10px] bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--surface)] transition hover:bg-[var(--foreground)]/85 active:translate-y-px` + FOCUS |

- **어두운 알약(`DARK_PILL`)은 없앤다.** 눌린 칩과 모양이 같아 헷갈린다. '다시 시도'는 `SMALL`.
- 글자 안 링크(모달 안 '새로 등록' 같은 밑줄 글자)도 `hover:text-[var(--brand)]` 같은 호버를 단다.

### 상태 배지 `GoodplaceStatusBadge`
`inline-flex h-[22px] cursor-default items-center gap-1 rounded-md px-1.5 text-xs font-semibold whitespace-nowrap select-none` + 톤(`STATUS_TONE_CLASS_NAMES`, 색은 그대로).
안 첫 요소로 점 `<span aria-hidden="true" className="size-1.5 rounded-full bg-current" />`.
테두리·그림자·호버 없음. 글자가 있으므로 색만으로 구분하지 않는다.

### 태그 (내 매물·내 손님·사유 종류)
`inline-flex h-[22px] cursor-default items-center rounded-md bg-[var(--background)] px-2 text-xs font-semibold text-[var(--muted)]`. 점 없음. 사유 태그는 `bg-[var(--warning-soft)] text-[var(--warning)]`.

### 알약 (요약 카드 안 작은 칸)
`rounded-2xl bg-[var(--background)] px-4 py-3.5`, 라벨 13px muted, 값 `text-xl font-extrabold`. 요약 화면(수입)에만 쓰고 상세에는 쓰지 않는다.

### 행 카드 (상세 밖 카드형 줄: 일정 하루 목록)
`<ul class="grid gap-2">` 안에 `<Link class={ROW}>`. 행 전체가 링크. 행 안 다른 버튼(⋮, 계약 진행)은 링크 밖 형제로 두고 `relative z-10`.
왼쪽 배지: `size-[52px] rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]` (날짜·시각).

### 표 (목록 화면, `ListTable look="goodplace"`)
- 감싸기: `overflow-x-auto rounded-[18px] bg-[var(--surface)]` (테두리 없음)
- thead: 바탕 없음, `border-b border-[var(--line)]/60`, th `h-12 px-5 text-[13px] font-semibold text-[var(--muted)]`
- 정렬 아이콘: 정렬 중 `text-[var(--brand)]`, 아님 `opacity-40`
- tbody 행: `border-b border-[var(--line)]/40 last:border-b-0 hover:bg-[var(--background)]/60`, td `px-5 py-3.5 text-sm`
- 첫 열 번호: `font-mono text-[13px] text-[var(--muted)]`. 사람·매물 이름 열은 `font-semibold`, 금액 열 `font-bold tabular-nums`
- 표 아래 페이지: `mt-4`

### 필터 바 (목록 화면)
한 줄: 왼쪽 검색 묶음, 오른쪽 상태 칩. 모바일은 두 줄(검색 → 칩, 칩은 `overflow-x-auto` 금지, `flex-wrap`).
- 검색 묶음 `form`: `flex h-11 min-w-0 flex-1 items-center gap-1 rounded-[14px] bg-[var(--surface)] p-1 sm:max-w-[30rem] focus-within:outline-2 focus-within:outline-[var(--brand)]`
  - 항목 select: `h-9 appearance-none rounded-[10px] bg-[var(--background)] pl-3 pr-8 text-sm font-semibold cursor-pointer`
  - 돋보기 `search` 아이콘(`size-4 text-[var(--muted)]/70 ml-2`) + input `h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none`
  - 검색: `h-9 rounded-[10px] bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--surface)] transition hover:bg-[var(--foreground)]/85 active:translate-y-px`
- 검색 초기화: 묶음 오른쪽 `text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]`
- 상태 필터: select 대신 칩 `[전체] [상태1] …` (`?status=` 그대로)

### 페이지 이동 (`Pagination look="goodplace"`)
- 숫자: `grid h-9 min-w-9 place-items-center rounded-[10px] px-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface)]`
- 현재: `bg-[var(--foreground)] text-[var(--surface)]`
- 이전·다음: 아이콘 버튼(`chevron-left/right`, `aria-label="이전 페이지"`), 비활성 `opacity-40`

### 상세 화면 (미팅·계약·매물·고객 공통)
상세는 **읽는 화면**이다. 큰 숫자 요약 카드·알약·장식은 쓰지 않고, 정보 밀도와 훑어보기를 우선한다.
시안: `goodplace-style-meeting-detail.html`.

순서(위에서 아래): 제목 줄 → 정보 시트 → 진행 목록(매물·계약 등) → 기록(로그). 긴 것은 아래로.

1. **제목 줄** (`GoodplacePageHead`): 왼쪽 위 한 줄 `케이스 RDRT7HQB [복사] [상태 배지]`(13px muted, 번호 mono),
   아래 h2에 그 건의 제목(미팅 제목·매물 이름·고객 이름 등). '○○ 상세' 같은 말은 쓰지 않는다.
   오른쪽에 동작 버튼(보조 → 위험 → 주 순서, 주 버튼 하나). 지금 카드 아래 `footer` 버튼 줄은 없앤다.
2. **정보 시트**: `CARD px-5 py-1 md:px-7` 하나. 안을 묶음(`div`)으로 나누고 묶음 사이 `border-t border-[var(--line)]/60`.
   - 묶음: `grid gap-3 py-[18px] md:grid-cols-[88px_1fr] md:gap-6`. 왼쪽 묶음 제목 `text-sm font-bold`(h3).
   - 오른쪽 `dl`: `grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3.5`. dt 13px 라벨, dd 15px 값(금액 `font-bold tabular-nums`).
     보조 표기(㎡ 병기, '보증금 + 권리금')는 dd 안 아래 줄 `block text-xs font-medium ${FAINT}`.
   - **모든 값은 같은 크기.** 중요도는 묶음 순서(사람 → 찾는 것/대상 → 돈)로만 준다.
   - 한 묶음 4칸을 기본으로 맞춘다(빈칸이 남으면 다른 묶음 항목을 옮겨 채운다). 빈 값은 `EMPTY_VALUE`.
   - 같은 정보를 제목 줄과 시트에 두 번 쓰지 않는다(예: 고객 이름·연락처는 시트의 '고객' 묶음에만).
   - 화면별 묶음 예: 미팅 `고객 / 찾는 조건 / 예산`, 계약 `당사자 / 임대 조건 / 일정·금액`, 매물 `위치·면적 / 임대 조건 / 진행`, 고객 `연락처 / 유입`.
3. **진행 목록**(미팅 매물, 연결 계약, 고객의 미팅 등): 묶음 머리(19px + 건수, 오른쪽 작은 보조 버튼) +
   **카드 하나 안의 줄 목록**. 줄마다 떠 있는 행 카드는 상세에서 쓰지 않는다.
   - 카드 `CARD px-2`, 열 머리 `h-11 px-3.5 text-xs font-semibold text-[var(--muted)] border-b border-[var(--line)]/60`(`aria-hidden`, 데스크톱만).
   - 줄: `relative grid items-center gap-4 min-h-[68px] px-3.5 py-3 rounded-xl border-b border-[var(--line)]/40 last:border-b-0 hover:bg-[var(--background)]/60`.
     열 폭은 고정(예: 미팅 매물 `[1fr_84px_104px_136px]` = 매물 | 매물 상태 | 이 미팅 계약 | 동작).
   - 줄 전체 링크는 `absolute inset-0` 링크(+`aria-label`)로, 줄 안 버튼은 `relative z-10`. 동작은 `ROW_ACTION`(계약 진행 + 화살표), 메뉴는 `ICON_BUTTON`(⋮).
   - 상태는 열마다 배지 하나. 해당 없음은 FAINT `-`. ⋮가 없는 줄도 같은 폭 빈칸을 둬 열을 맞춘다.
   - 0건: 머리의 추가 버튼이 있으면 카드 안 빈 문구, 추가할 수 없는 목록(계약)은 묶음째 숨긴다.
   - 모바일: 열 머리 숨기고 이름 → 설명 → 배지 → 버튼 순으로 쌓는다.

### 기록(로그) 카드 `GoodplaceLogPanel`
상세 맨 아래. 머리는 카드 밖 묶음 머리(19px + 건수) + 오른쪽 작은 보조 버튼 '기록 추가'.
카드 `CARD px-5 py-1 md:px-6` 안 `ol divide-y divide-[var(--line)]/60`, 항목 `py-3.5`.
데스크톱 항목은 `grid grid-cols-[92px_1fr_auto] gap-4 items-baseline` = 날짜(FAINT 13px, 왼쪽 고정) | 본문 `text-[15px] leading-7` | 수정(작은 텍스트 버튼).
사유 종류(중단·재개·계약취소)는 본문 앞 사유 태그. 모바일은 날짜를 본문 아래 줄로.

### 폼
- 감싸기: `HERO` 카드, 묶음(`section`) 사이 `gap-8`, 묶음 제목 `text-[15px] font-bold`
- `FormField look="goodplace"`: 라벨 `pt-3 text-sm font-semibold`, 칸 `sm:grid-cols-[9rem_1fr]`
- 입력·select·textarea: `h-11 w-full rounded-xl border border-transparent bg-[var(--background)] px-3.5 text-[15px] outline-none placeholder:text-[var(--muted)]/70 focus:border-[var(--brand)] focus:bg-[var(--surface)] disabled:opacity-60` (textarea `h-auto py-3`)
- 여러 개 중 하나(유입 경로 등): 칩 모양. 흰 카드 안이므로 아님 상태 `bg-[var(--background)]`
- 오류 칸: `rounded-xl bg-[var(--error-soft)] px-4 py-3 text-sm text-[var(--error)]`, 입력 오류는 `aria-invalid` + 아래 `text-xs text-[var(--error)]`
- 아래 버튼 줄: 카드 안 `mt-8 flex justify-end gap-2` — 취소(`SECONDARY`) + 저장(`PRIMARY`)

### 모달 (`Modal`·`ConfirmDialog`·`ReasonDialog` `look="goodplace"`)
- 틀: `rounded-[20px] border-0 bg-[var(--surface)] shadow-[0_12px_40px_rgba(16,24,40,0.16)] backdrop:bg-black/40`
- 머리: 구분선 없음 `px-6 pt-6 pb-2`, 제목 `text-lg font-extrabold`, 닫기 아이콘 버튼 `rounded-[10px]`
- 본문 `px-6 py-4`, 아래 버튼 줄 구분선·회색 바탕 없음 `px-6 pb-6 pt-2 flex justify-end gap-2`
- 버튼은 위 `PRIMARY` / `SECONDARY` / `DANGER_PRIMARY`(위험 확인)

### 빈·로딩·오류
- 로딩·빈: `CARD px-6 py-10 text-center text-sm text-[var(--muted)]` ("불러오고 있습니다.", 빈 문구)
- 오류: 같은 카드 `role="alert"`, 문구 `text-[var(--error)]` + 작은 보조 버튼(`SMALL`) '다시 시도'
- 표 안 빈·오류는 표 카드 안에서 같은 문구·버튼
- `GoodplaceLoader`(상세·수정)도 같은 카드로, 오류에 '다시 시도' 추가

### 달력 (일정)
- 카드 `HERO`(`p-4 md:p-6`). 위 줄: 범례(점 `size-2 rounded-full` + 글자) 왼쪽, 안내 FAINT `text-xs` 오른쪽
- 요일 머리: 바탕·선 없음 `py-2 text-xs font-semibold text-[var(--muted)]` (일 `--error`, 토 `--brand`)
- 칸: 선 없이 `gap-1`, 칸 버튼 `h-28 rounded-xl p-2 hover:bg-[var(--background)]`, 다른 달 날짜 `opacity-40`
- 고른 날: `bg-[var(--brand-soft)]`(+ `aria-pressed`), 오늘 숫자: `size-6 rounded-full bg-[var(--brand)] text-white font-bold`
- 일정 표시: `rounded-md px-1.5 py-0.5 text-[11px] font-semibold` + 종류 색(미팅 brand-soft/brand, 계약 success-soft/success, 잔금 warning-soft/warning), 넘치면 `+N건` FAINT
- 모바일: 칸 `h-16`, 일정은 점만
- 아래: 묶음 머리 "11월 12일 (목) 일정 3건" + 행 카드 목록 (왼쪽 52px 배지에 시각 또는 '종일', 종류는 점+글자)

## 5. 헤더·사이드 메뉴 (`AdminShell look="goodplace"`)

시안: `goodplace-shell.html`. 초이돌상(`look` 없음 = `default`)은 지금 모양 그대로 둔다.

원칙: 틀(헤더·메뉴)은 **회색 페이지에 녹이고**, 흰 카드는 본문만 쓴다. 고른 메뉴 하나만 흰 알약으로 떠오른다.

### 헤더
- 틀: `sticky top-0 z-20 flex h-14 md:h-16 items-center justify-between bg-[var(--background)] pl-4 pr-2 md:pl-6 md:pr-8` (선·흰 바탕 없음)
  - 왼쪽 여백 24는 메뉴 아이콘 줄(12 + 12)과, 오른쪽 여백 32는 본문 오른쪽 끝과 맞춘다.
- 서비스 이름(로고 자리): `Link href="/goodplace"` `rounded-lg text-lg md:text-[19px] font-extrabold tracking-[-0.02em] text-[var(--brand)] transition hover:text-[var(--brand-hover)]` + FOCUS
- **현재 위치(굿플레이스 > 미팅)는 없앤다.** 고른 메뉴 알약과 본문 h2가 같은 것을 이미 알려 준다.
- 오른쪽(데스크톱만 `hidden md:flex items-center gap-3`):
  - 관리자 이름 `max-w-48 truncate text-[13px] font-semibold text-[var(--muted)]`
  - 로그아웃 `SMALL_BUTTON` + 앞 아이콘 `logout size-3.5 text-[var(--muted)]`, 로그아웃 중 `disabled`
- 모바일 메뉴 열기: `ICON_BUTTON` 모양을 40px로 `size-10`, 아이콘 `menu size-[22px]`, `aria-label="메뉴 열기"` `aria-expanded` `aria-controls`.
  회색 바탕 위라 호버·열림 바탕은 `hover:bg-[var(--surface)] aria-expanded:bg-[var(--surface)]`.

### 사이드 메뉴 (데스크톱)
- 틀: `md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-60 md:shrink-0` + `px-3 py-2`. **바탕·오른쪽 선 없음.**
- 목록 `flex flex-col gap-0.5`. 묶음 머리는 두지 않는다(메뉴 7개).
- 줄 `Link`: `group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold cursor-pointer transition` + FOCUS
  - 기본: `text-[var(--muted)]`, 아이콘 `size-5 text-[var(--muted)]/70`
  - 호버: `hover:bg-[var(--surface)]/60 hover:text-[var(--foreground)]`, 아이콘 `group-hover:text-[var(--muted)]`
  - 누름: `active:bg-[var(--line)]/50`
  - 선택(`aria-current="page"`): `bg-[var(--surface)] font-bold text-[var(--foreground)] shadow-[0_1px_2px_rgba(16,24,40,0.06)]`, 아이콘 `text-[var(--brand)]`
  - 선택은 바탕·굵기·아이콘 색 세 가지로 알린다(색만으로 구분하지 않음).
- 본문 `main`: `p-4 md:px-8 md:pt-2 md:pb-8`. 헤더가 회색이라 위 여백을 줄여 h2와 첫 메뉴 줄 높이를 맞춘다.

### 모바일 서랍
- 뒤 막: `fixed inset-0 z-30 bg-black/40` (누르면 닫힘)
- 서랍: 오른쪽에서 `fixed inset-y-0 right-0 z-40 w-72 max-w-[85vw] flex flex-col rounded-l-[20px] bg-[var(--background)] shadow-[0_12px_40px_rgba(16,24,40,0.16)]`
- 머리: `h-14 flex items-center justify-between pl-5 pr-2`, 서비스 이름(글자) + 닫기(위 열기 버튼과 같은 모양, `x`, `aria-label="메뉴 닫기"`). 선 없음.
- 메뉴: 데스크톱과 같은 줄 모양, 높이만 `h-12`.
- 아래: `m-3 flex items-center justify-between gap-2 rounded-[18px] bg-[var(--surface)] py-3 pr-3 pl-4` = 관리자 이름(`text-sm font-semibold truncate`) + `SMALL_BUTTON` 로그아웃.
- 동작은 지금 그대로: Esc·뒤 막·메뉴 누르면 닫힘, 열 때 닫기 버튼으로 포커스, 닫으면 열기 버튼으로 돌아감, 본문 스크롤 잠금.


## 6. 다크 모드

전체 규칙·토큰 표: `backoffice-theme.md`. 시안: `backoffice-dark.html`. 초이돌상도 이 가이드 모양을 쓰므로 같은 규칙이다.

- 다크는 남색 기운 없는 중성 회색(바탕 #1d2025, 카드 #22252b, 선 #30343b), 브랜드는 채도 낮은 하늘색 #8eb2ea.
- 토큰 이름은 그대로, 다크 값만 바뀐다. 화면 코드에 `dark:` 클래스를 쓰지 않는다. 색은 토큰과 그 투명도만.
- 채움(brand·error) 위 글자는 `text-white` 대신 `text-[var(--on-accent)]`(다크에서 어두운 회색 #1a1d21).
- 그림자는 `shadow-(--shadow-xs|sm|lift|pop|fill|fill-hover|danger-sm|danger-hover)` 토큰만. `rgba(...)`·`shadow-sm`·`shadow-xl`을 직접 쓰지 않는다. 다크에서는 1px 밝은 테두리가 된다.
- 뒤 막은 `bg-[var(--backdrop)]` / `backdrop:bg-[var(--backdrop)]`.
- 눌린 칩·현재 페이지·검색 버튼·툴팁(foreground 바탕)은 다크에서 밝게 뒤집힌다. 그대로 둔다.
- `--brand-strong`은 brand-soft 위 진한 글자 전용. 주 버튼 누름은 `active:brightness-90`.
- 헤더·사이드 메뉴: 다크에서도 중성 회색 바탕(#1d2025)에 녹고, 고른 메뉴는 surface 알약 + `shadow-xs` 테두리 + 굵은 글자 + brand 아이콘.
- 화면 모드 버튼: 헤더 오른쪽 `[화면 모드] 이름 [로그아웃]`, 모바일은 서랍 아래 카드의 3칸 세그먼트, 로그인은 오른쪽 위. 자세한 것은 `backoffice-theme.md` 3절.

## 7. 표 개수

- 표 아래 페이지 줄: `grid grid-cols-[1fr_auto_1fr] items-center`(모바일 `flex flex-col items-center gap-3`). 페이지 번호 가운데, 오른쪽 끝 셀렉트.
- 셀렉트 `aria-label="한 페이지에 보일 개수"`, "10개씩 / 20개씩 / 50개씩 / 100개씩", 기본 20.
  `h-9 appearance-none rounded-[10px] bg-[var(--surface)] pr-8 pl-3 text-sm font-semibold text-[var(--muted)] cursor-pointer hover:text-[var(--foreground)] hover:shadow-[inset_0_0_0_1px_var(--line)]` + FOCUS, 오른쪽 `chevron-down size-4`.
- 주소 `?size=`(20이면 뺌), 바꾸면 1페이지. 건수 10 이하이고 기본값이면 숨김. 자세한 것은 `backoffice-theme.md` 4절.
