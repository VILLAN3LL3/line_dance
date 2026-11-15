import { QueryClient } from "@tanstack/react-query";

/**
 * Defaults keep the pre-TanStack behaviour: no automatic retries and no refetch on window focus,
 * so users and e2e tests only see requests triggered by explicit actions or mounting.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
