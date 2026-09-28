// biblehub 문서의 상대 경로(/topical/..., /genesis/1-1.htm)를 biblehub.com 주소로 바꾼다.
export function biblehubUrl(path?: string) {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  return `https://biblehub.com${path.startsWith('/') ? '' : '/'}${path}`;
}
