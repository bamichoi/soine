/** 주소의 번호를 대문자로 정리한다. 형식이 틀리면 null */
export function parseRouteCode(rawCode: string): string | null {
  const code = rawCode.toUpperCase();
  return /^[0-9A-Z]{1,16}$/.test(code) ? code : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 주소의 UUID를 소문자로 정리한다. 형식이 틀리면 null */
export function parseRouteId(rawId: string): string | null {
  return UUID_PATTERN.test(rawId) ? rawId.toLowerCase() : null;
}
