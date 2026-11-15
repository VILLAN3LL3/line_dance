import "./styles/index.css";
import "./styles/SongSearchButtons.css";
import "./styles/theme.css";

import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppRouter } from "./components/AppRouter";
import { createQueryClient } from "./shared/query/queryClient";

const rootElement = document.getElementById("root");
const queryClient = createQueryClient();

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
