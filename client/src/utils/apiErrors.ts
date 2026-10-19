import axios from "axios";

export const DATABASE_RESTARTING_EVENT = "line-dance:database-restarting";

const databaseRestartingMessage =
  "The server is reconnecting to its database. Your changes may not have been saved. Wait a few seconds, then try again.";

export function getDatabaseRestartingErrorMessage(error: unknown): string | null {
  if (
    axios.isAxiosError<{ code?: string }>(error) &&
    error.response?.status === 503 &&
    error.response.data?.code === "DATABASE_RESTARTING"
  ) {
    return databaseRestartingMessage;
  }

  return null;
}

export function reportGlobalApiError(error: unknown): void {
  const message = getDatabaseRestartingErrorMessage(error);
  if (!message || typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(DATABASE_RESTARTING_EVENT, {
      detail: { message },
    }),
  );
}

export function getChoreographyUpdateErrorMessage(error: unknown): string | null {
  if (getDatabaseRestartingErrorMessage(error)) return null;
  return "Failed to update choreography";
}
