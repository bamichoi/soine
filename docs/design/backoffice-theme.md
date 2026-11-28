# 백오피스 화면 모드(다크)와 표 개수 고르기

범위: 백오피스 전체(`/login`, `/choidolsang/*`, `/goodplace/*`). 시안: `backoffice-dark.html`.
초이돌상도 굿플레이스 모양(`goodplace-style-guide.md`)으로 바뀌므로 규칙은 하나다. 가이드 6·7절은 이 문서를 요약해 가리킨다.

## 1. 토큰 (globals.css)

색은 지금처럼 토큰만 쓴다. 다크는 같은 토큰 이름의 값만 바꾼다. 새 토큰은 `--on-accent`, `--backdrop`, `--shadow-*`뿐이다.

다크는 남색 기운 없는 **중성 회색**이다(순수 검정·진한 남색 없음). 브랜드 파랑과 상태 색은 채도를 낮춘다.

| 토큰 | 라이트 | 다크 | 다크 대비(주요 짝) |
| --- | --- | --- | --- |
| `--background` | #f4f6f9 | #1d2025 | |
| `--surface` | #ffffff | #22252b | surface / background 1.06 (라이트 1.08) |
| `--foreground` | #1d2433 | #e4e6ea | surface 위 12.3 |
| `--muted` | #667085 | #8d929b | surface 위 4.9, background 위 5.2 |
| `--muted` 70% (FAINT) | | | surface 위 3.1 (라이트 2.8) |
| `--line` | #d9dee6 | #30343b | |
| `--brand` | #094ea3 | #8eb2ea | surface 위 7.1, brand-soft 위 6.2 |
| `--brand-hover` | #0b5cc0 | #a8c4f0 | 다크는 호버 때 더 밝아진다 |
| `--brand-strong` | #073b7b | #c3d7f6 | brand-soft 위 9.1 ("진한 글자" 역할) |
| `--brand-soft` | #e6eef8 | #28303c | |
| `--error` / `--error-soft` | #b42318 / #fef3f2 | #e0857c / #3a2a29 | soft 위 5.1 |
| `--success` / `--success-soft` | #067647 / #ecfdf3 | #7fc79a / #22332a | soft 위 6.7 |
| `--warning` / `--warning-soft` | #b54708 / #fffaeb | #e3b06a / #3a3124 | soft 위 6.5 |
| `--on-accent` (새) | #ffffff | #1a1d21 | brand 위 7.8, error 위 6.3 |
| `--backdrop` (새) | rgb(0 0 0 / .4) | rgb(0 0 0 / .5) | 모달·서랍 뒤 막 |

- **`--on-accent`**: brand·error 채움 위 글자. 다크의 brand는 밝은 파랑이라 흰 글자가 읽히지 않는다(2.3:1).
  그래서 `text-white`를 모두 `text-[var(--on-accent)]`로 바꾼다. 다크에서 주 버튼은 "채도 낮은 하늘색 + 어두운 회색 글자"가 된다.
- **`--brand-strong`**은 "brand-soft 위의 진한 글자" 한 가지 역할만 쓴다(일정 미팅 배지, 날짜 배지).
  주 버튼 누름(`active:bg-[var(--brand-strong)]`)은 `active:brightness-90`으로 바꾼다(다크에서 누를 때 더 밝아지지 않게).
- **뒤집히는 것**: 눌린 칩·현재 페이지·검색 버튼·툴팁은 `foreground` 바탕 + `surface` 글자라 다크에서 밝은 바탕 + 어두운 글자로 자동으로 뒤집힌다. 그대로 둔다.
- 대비: 본문·라벨은 모두 4.5 이상. FAINT(옅은 글자)는 다크 3.1로 라이트(2.8)보다 낫다. 번호·건수·날짜에만 쓰는 지금 규칙을 지킨다.

### 그림자 토큰 (새)

다크에서는 검은 그림자가 안 보이므로 **1px 밝은 테두리**(rgba 흰색 6~10%)로 대신한다.

| 토큰 | 라이트 | 다크 | 쓰는 곳 |
| --- | --- | --- | --- |
| `--shadow-xs` | `0 1px 2px rgba(16,24,40,.06)` | `0 0 0 1px rgba(255,255,255,.06)` | 버튼 쉼, 고른 메뉴 알약, 세그먼트 눌림, 로그인 카드·탭 |
| `--shadow-sm` | `0 2px 6px rgba(16,24,40,.10)` | `0 0 0 1px rgba(255,255,255,.10), 0 2px 6px rgba(0,0,0,.40)` | 보조 버튼 호버 |
| `--shadow-lift` | `0 4px 16px rgba(16,24,40,.06)` | `0 0 0 1px rgba(255,255,255,.08)` | 행 카드 호버 |
| `--shadow-pop` | `0 12px 40px rgba(16,24,40,.16)` | `0 0 0 1px rgba(255,255,255,.08), 0 16px 48px rgba(0,0,0,.60)` | 모달, ⋮·화면 모드 메뉴, 모바일 서랍 |
| `--shadow-fill` | `0 1px 2px rgba(16,24,40,.12), inset 0 -1px 0 rgba(0,0,0,.16)` | `inset 0 -1px 0 rgba(0,0,0,.25)` | 주·위험 확인 버튼 쉼 |
| `--shadow-fill-hover` | `0 4px 12px rgba(9,78,163,.28), inset 0 -1px 0 rgba(0,0,0,.16)` | `0 4px 12px rgba(0,0,0,.45), inset 0 -1px 0 rgba(0,0,0,.25)` | 주 버튼 호버 |
| `--shadow-danger-hover` | `0 4px 12px rgba(180,35,24,.28)` | `0 4px 12px rgba(0,0,0,.45)` | 위험 확인 버튼 호버 |
| `--shadow-danger-sm` | `0 2px 6px rgba(180,35,24,.12)` | `0 0 0 1px rgba(224,133,124,.25)` | 위험 버튼 호버 |

클래스는 `shadow-(--shadow-xs)`처럼 쓴다(Tailwind 4 변수 문법). Tailwind 기본 `shadow-sm`·`shadow-xl`도 위 토큰으로 바꾼다.

### globals.css 모양

```css
:root { color-scheme: light; /* 라이트 값 */ }
:root[data-theme='dark'] { color-scheme: dark; /* 다크 값 */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { color-scheme: dark; /* 다크 값 (위와 같은 값) */ }
}
```

- 다크 값이 두 번 적히지만 Tailwind 없이 CSS만으로 깔끔하다. 두 곳 값이 어긋나지 않게 주석으로 묶는다.
- `color-scheme`을 꼭 둔다: 기본 select 목록, 날짜 입력 달력, 스크롤바, 자동완성 바탕이 다크를 따른다.

## 2. 전환 방식

| 고른 값 | `localStorage['soine.theme']` | `<html>` |
| --- | --- | --- |
| 시스템(기본) | 키 없음 | `data-theme` 없음 → `prefers-color-scheme`이 정함 |
| 라이트 | `'light'` | `data-theme="light"` |
| 다크 | `'dark'` | `data-theme="dark"` |

- **깜빡임 막기**: `app/layout.tsx`의 `<html lang="ko" suppressHydrationWarning>` 안 `<head>`에 첫 그림 전에 도는 작은 인라인 스크립트를 둔다.
  ```js
  try{var t=localStorage.getItem('soine.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}
  ```
  시스템일 때는 할 일이 없다(CSS 미디어 쿼리가 처리). 값이 이상하면 무시한다(= 시스템).
  React 19의 `<script>`는 서버 렌더 때 그대로 나가므로 `dangerouslySetInnerHTML`로 넣는다(고정 문자열, biome-ignore에 이유 적기).
- `viewport` 내보내기에 `colorScheme: 'light dark'`, `themeColor`를 두 미디어로(#f4f6f9 / #1d2025).
- 바꿀 때(클라이언트): `localStorage`에 쓰거나 지우고 `document.documentElement.dataset.theme`를 바꾸거나 지운다. 새로 고침 없이 바로 바뀐다.
- 다른 탭과 맞추기: `storage` 이벤트로 같은 처리를 한다.
- 시스템을 고른 상태에서 기기 설정이 바뀌면 CSS가 바로 따라간다(JS 필요 없음).
- 고른 값은 서비스 공통(한 브라우저 한 값). 로그인 화면에서 고른 값도 같다.
- 바뀌는 순간 전체 `transition`이 번쩍이지 않게, 바꾸는 동안만 `transition: none`을 거는 처리는 하지 않는다(필요해지면 추가).

## 3. 화면 모드 버튼과 메뉴

새 아이콘 파일(`apps/backoffice/public/icons/`, viewBox 24, 단색 선): `sun.svg`, `moon.svg`, `monitor.svg`. `ICON_NAMES`에 등록. 체크는 있는 `check`.

- 버튼 아이콘은 **고른 값**(라이트 sun, 다크 moon, 시스템 monitor). `aria-label="화면 모드"`, `aria-haspopup="menu"`, `aria-expanded`, `title="화면 모드: 다크"`.
- 메뉴: `role="menu"` `aria-label="화면 모드"`, 항목 셋 `role="menuitemradio"` `aria-checked` — 라이트 / 다크 / 시스템. 항목 = 아이콘 16 + 글자 + 고른 항목 오른쪽 `check`(brand). 색과 체크 아이콘 두 가지로 알린다.
- 키보드: 버튼 Enter·Space·↓로 열고 고른 항목에 포커스, ↑↓로 이동, Enter·Space로 고르고 닫기, Esc로 닫고 버튼으로 포커스, Tab·바깥 누르면 닫기.
- 고르면 바로 적용하고 메뉴를 닫는다. 확인 문구는 없다.

초이돌상도 굿플레이스와 같은 모양으로 바뀌므로(개발 진행 중) 자리·모양은 하나다(`AdminShell` 굿플레이스 모양 기준).

| 자리 | 모양 |
| --- | --- |
| 데스크톱 헤더 | 오른쪽 `[화면 모드] 이름 [로그아웃]` 순서, `gap-3`. 버튼 `ICON_BUTTON`(32, 둥근 10), 회색 헤더 위라 호버·열림 바탕 `bg-[var(--surface)]`, 아이콘 `size-[18px]` |
| 메뉴 | `absolute top-full right-0 mt-1.5 z-30 w-37 rounded-xl bg-[var(--surface)] p-1 shadow-(--shadow-pop)`. 항목 `flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 text-sm font-semibold cursor-pointer`, 아님 muted, 호버·포커스 `bg-[var(--background)] text-[var(--foreground)]`, 고른 항목 foreground + 오른쪽 `check`(brand) |
| 모바일(md 미만) | 헤더에는 두지 않는다. 서랍 아래 카드에서 이름·로그아웃 줄 아래 3칸 세그먼트(`fieldset aria-label="화면 모드"`, `grid grid-cols-3 rounded-[14px] bg-[var(--background)] p-1`, 버튼 `h-8 rounded-[10px] text-[13px] font-bold` + 아이콘 14, `aria-pressed`, 눌림 `bg-[var(--surface)] shadow-(--shadow-xs)`) |
| 로그인 | 화면 오른쪽 위 `fixed top-4 right-4`, 같은 버튼(36)과 메뉴 |

- 서랍 안에서 팝업을 또 열지 않으려고 모바일은 세그먼트로 한다(누르면 바로 적용, 서랍은 열린 채).
- 다크에서 틀(두 서비스 같음): 헤더·사이드 메뉴는 `--background`(#1d2025)에 녹고, 고른 메뉴 알약은 `--surface`(#22252b) + `shadow-xs`(1px 흰 6% 테두리) + 굵은 글자 + brand 아이콘으로 떠오른다. 바탕 차이만으로는 약하므로 테두리가 꼭 필요하다.
  헤더는 sticky라 스크롤 때 흰 카드가 헤더 밑으로 들어가는 모습은 라이트와 같다(헤더 아래 선은 두지 않는다).

## 4. 표 한 페이지 개수

- 값: 10 / 20 / 50 / 100, 기본 **20**(지금 백엔드 고정값: `GOODPLACE_PAGE_SIZE`, `INQUIRY_PAGE_SIZE`, `RESERVATION_PAGE_SIZE`, `CONCEPT_PAGE_SIZE` 모두 20).
- 주소: `?size=50`. 기본 20이면 주소에서 뺀다. 목록에 없는 값이면 20. 바꾸면 `page`를 1로(주소에서 뺌), 다른 쿼리(q·field·status·sort·order)는 그대로.
  상세로 갈 때 붙이는 목록 쿼리(`listQuery`)에도 들어가서 '목록으로'가 같은 개수로 돌아온다.
- 백엔드: 지금 `PageQueryDto`(굿플레이스)는 `page`·`q`만, `ListInquiriesQueryDto`는 `page`(1~100,000)만 받고 개수는 받지 않는다.
  같은 이름 `size`를 더한다: `@IsOptional() @Type(() => Number) @IsIn([10, 20, 50, 100])`, 없으면 20. 응답 `pagination.pageSize`에 실제 값을 돌려준다. 최대 100.
- 자리: 표 아래 페이지 줄. 데스크톱은 `grid grid-cols-[1fr_auto_1fr] items-center`로 페이지 번호는 가운데 그대로, 셀렉트는 오른쪽 칸 끝(`justify-self-end`).
  모바일(sm 미만)은 `flex flex-col items-center gap-3`: 페이지 번호 줄 → 그 아래 셀렉트(가운데). 가로 스크롤 없음.
- 셀렉트: `<select aria-label="한 페이지에 보일 개수">`, 항목 글자 "10개씩 … 100개씩", 오른쪽 `chevron-down`.
  - 모양(두 서비스 공통): `h-9 appearance-none rounded-[10px] bg-[var(--surface)] pr-8 pl-3 text-sm font-semibold text-[var(--muted)] cursor-pointer hover:text-[var(--foreground)] hover:shadow-[inset_0_0_0_1px_var(--line)]` + FOCUS (회색 바탕 위 칩과 같은 쉼·호버).
- 보이는 조건: 전체 건수가 10 이하이고 지금 개수가 기본(20)이면 숨긴다(바꿔도 같은 화면). 그 밖에는 보인다. 로딩·오류 때는 페이지 줄과 함께 숨는다(지금과 같음).
- 개수는 브라우저에 기억하지 않는다(주소에만). 결정 사항 참고.
- 적용 대상: `ListTable`(초이돌상 예약, 굿플레이스 미팅·계약·매물·고객) + 따로 짠 `choidolsang-inquiry-table`·`choidolsang-concept-table`. `Pagination`에 `pageSize`·`onPageSizeChange` 속성을 더해 한 컴포넌트에서 그린다.
