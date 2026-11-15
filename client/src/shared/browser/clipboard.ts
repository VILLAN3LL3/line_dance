/** Writes to the clipboard; falls back to a prompt the user can copy from when access is denied. */
export async function copyTextWithPromptFallback(text: string, promptLabel: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    globalThis.prompt(promptLabel, text);
  }
}
