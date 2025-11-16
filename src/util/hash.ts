export function hashString(s: string): string {
  let h = 0,
    i = 0;
  for (; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h.toString();
}
