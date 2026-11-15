import { QueryClientProvider } from "@tanstack/react-query";
import { ReactElement, ReactNode } from "react";

import { render } from "@testing-library/react";

import { createQueryClient } from "../../shared/query/queryClient";

/** Renders with a fresh QueryClient per call so cached data never leaks between tests. */
export function renderWithQueryClient(ui: ReactElement) {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper }) };
}

export function createQueryWrapper() {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}
