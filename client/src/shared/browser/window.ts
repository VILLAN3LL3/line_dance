/** Opens a same-origin path in a new tab without giving the new page access to this window. */
export function openInNewTab(path: string): void {
  globalThis.open(path, "_blank", "noopener,noreferrer");
}
