export type UrlCheckStatus = "idle" | "checking" | "ok" | "error";

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
