export function getData(key: string): unknown {
  if (typeof window === 'undefined' || !localStorage) return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function setData(key: string, value: unknown): void {
  if (typeof window === 'undefined' || !localStorage) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeData(key: string): void {
  if (typeof window === 'undefined' || !localStorage) return;
  localStorage.removeItem(key);
}
