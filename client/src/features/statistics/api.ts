import { httpClient } from "../../shared/http/httpClient";
import type { RepertoireStatistics } from "../../types";

export async function fetchRepertoireStatistics(): Promise<RepertoireStatistics> {
  const response = await httpClient.get("/statistics/repertoire");
  return response.data;
}
