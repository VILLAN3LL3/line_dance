import { httpClient } from "../../shared/http/httpClient";
import type { AuthorStats } from "../../types";

const api = httpClient;

export async function getAuthorStats(): Promise<AuthorStats[]> {
  const response = await api.get("/authors/stats");
  return response.data;
}
