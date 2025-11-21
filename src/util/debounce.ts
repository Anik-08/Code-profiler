export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: NodeJS.Timeout | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}