import { httpClient } from "../../shared/http/httpClient";
import type {
  PracticeBaselineRequest,
  PracticeIntervalTier,
  PracticeLogPage,
  PracticeLogRequest,
  PracticeSummary,
} from "../../types";

export async function fetchPracticeSuggestions(): Promise<PracticeSummary[]> {
  const response = await httpClient.get("/practice/suggestions");
  return response.data;
}

export async function fetchPracticeLog(params: {
  limit: number;
  offset: number;
  q?: string;
}): Promise<PracticeLogPage> {
  const response = await httpClient.get("/practice-log", {
    params: { ...params, q: params.q || undefined },
  });
  return response.data;
}

export async function logPractice(
  request: PracticeLogRequest,
): Promise<{ logged: number; practiced_on: string }> {
  const response = await httpClient.post("/practice-log", request);
  return response.data;
}

export async function deletePracticeEntry(id: number): Promise<{ message: string }> {
  const response = await httpClient.delete(`/practice-log/${id}`);
  return response.data;
}

export async function fetchPracticeIntervals(): Promise<PracticeIntervalTier[]> {
  const response = await httpClient.get("/practice/intervals");
  return response.data.tiers;
}

export async function setPracticeBaseline(
  request: PracticeBaselineRequest,
): Promise<{ updated: number; step: number }> {
  const response = await httpClient.post("/practice/baseline", request);
  return response.data;
}
