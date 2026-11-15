export const confirmAction = (message: string): boolean => {
  if (typeof globalThis.confirm !== "function") {
    return true;
  }

  return globalThis.confirm(message);
};
