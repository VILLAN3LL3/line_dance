/** Typed gateway around localStorage so view models never touch the browser API directly. */
export const storage = {
  getString(key: string): string | null {
    return localStorage.getItem(key);
  },

  setString(key: string, value: string): void {
    localStorage.setItem(key, value);
  },

  /** Returns `undefined` when the key is missing or holds malformed JSON. */
  getJson<T>(key: string): T | undefined {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Error parsing stored value for "${key}":`, error);
      return undefined;
    }
  },

  setJson(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
