import axios from "axios";

import { reportGlobalApiError } from "./apiErrors";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

/** Shared axios instance. Feature gateways (`features/<name>/api.ts`) are its only consumers. */
export const httpClient = axios.create({
  baseURL: API_URL,
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    reportGlobalApiError(error);
    return Promise.reject(error);
  },
);
