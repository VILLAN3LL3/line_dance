/** Opens a URL in a new tab without giving the new page access to this window. */
export function openInNewTab(path: string): void {
  globalThis.open(path, "_blank", "noopener,noreferrer");
}

export function addWindowEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  listener: (event: WindowEventMap[K]) => void,
): () => void {
  globalThis.window.addEventListener(eventName, listener);
  return () => globalThis.window.removeEventListener(eventName, listener);
}
