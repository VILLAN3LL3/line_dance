import { httpClient } from "../../shared/http/httpClient";
import type {
  Choreography,
  ChoreographyFormData,
  ChoreographyWriteResponse,
  DuplicateChoreography,
  LearningStatus,
  PaginatedResponse,
  SearchFilters,
} from "../../types";

const api = httpClient;

export async function searchChoreographies(
  filters: SearchFilters,
): Promise<PaginatedResponse<Choreography>> {
  const response = await api.get("/choreographies/search", { params: filters });
  return response.data;
}

export async function fetchChoreographies(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<Choreography>> {
  const response = await api.get("/choreographies", {
    params: { page, limit },
  });
  return response.data;
}

export async function fetchChoreography(id: number): Promise<Choreography> {
  const response = await api.get(`/choreographies/${id}`);
  return response.data;
}

export async function createChoreography(
  data: ChoreographyFormData,
): Promise<ChoreographyWriteResponse> {
  const response = await api.post<ChoreographyWriteResponse>("/choreographies", data);
  return response.data;
}

export async function validateChoreography(data: ChoreographyFormData): Promise<void> {
  await api.post("/choreographies/validate", data);
}

export async function updateChoreography(
  id: number,
  data: Partial<ChoreographyFormData>,
): Promise<ChoreographyWriteResponse> {
  const response = await api.put<ChoreographyWriteResponse>(`/choreographies/${id}`, data);
  return response.data;
}

export async function deleteChoreography(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/choreographies/${id}`);
  return response.data;
}

export async function checkChoreographyDuplicates(
  name: string,
  level: string,
  authors: string[],
  excludeId?: number,
): Promise<DuplicateChoreography[]> {
  const response = await api.get("/choreographies/duplicates", {
    params: { name, level, authors, exclude_id: excludeId },
  });
  return response.data;
}

export async function setChoreographyRating(
  id: number,
  rating: number,
): Promise<{ choreography_id: number; rating: number }> {
  const response = await api.put(`/choreographies/${id}/rating`, { rating });
  return response.data;
}

export async function deleteChoreographyRating(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/choreographies/${id}/rating`);
  return response.data;
}

export async function setChoreographyLearningStatus(
  id: number,
  status: LearningStatus,
): Promise<{ choreography_id: number; status: LearningStatus; status_date: string | null }> {
  const response = await api.put(`/choreographies/${id}/learning-status`, { status });
  return response.data;
}

export async function deleteChoreographyLearningStatus(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/choreographies/${id}/learning-status`);
  return response.data;
}

export async function getMaxChoreographyCount(): Promise<number> {
  const response = await api.get("/choreographies/max-count");
  return response.data?.max_count || 0;
}
