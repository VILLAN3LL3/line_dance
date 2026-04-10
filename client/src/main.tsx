import "./styles/index.css";
import "./styles/theme.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppRouter } from "./components/AppRouter";

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
