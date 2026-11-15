import { httpClient } from "../../shared/http/httpClient";

const api = httpClient;

export async function checkUrl(url: string): Promise<{ ok: boolean; status: number | null }> {
  const response = await api.get("/url-check", { params: { url } });
  return response.data;
}
