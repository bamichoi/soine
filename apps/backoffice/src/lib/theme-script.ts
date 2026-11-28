// 화면 모드 저장 키와 첫 그림 전 스크립트. app/layout.tsx(서버)와 lib/theme.ts(클라이언트)가 같이 쓴다.
// docs/design/backoffice-theme.md 2절

export const THEME_STORAGE_KEY = 'soine.theme';

/**
 * 첫 그림 전에 <head>에서 도는 스크립트. 고정 문자열이다(사용자 입력이 들어가지 않는다).
 * 저장된 값이 light·dark가 아니면 무시한다(= 시스템, CSS 미디어 쿼리가 정한다).
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
