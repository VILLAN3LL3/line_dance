import axios from "axios";

import { Choreography, ChoreographyFormData, PaginatedResponse, SavedFilterConfiguration, SearchFilters } from "./types";

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

export async function fetchChoreographies(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Choreography>> {
  const response = await api.get('/choreographies', {
    params: { page, limit },
  });
  return response.data;
}

export async function fetchChoreography(id: number): Promise<Choreography> {
  const response = await api.get(`/choreographies/${id}`);
  return response.data;
}

export async function searchChoreographies(
  filters: SearchFilters
): Promise<PaginatedResponse<Choreography>> {
  const response = await api.get('/choreographies/search', {
    params: filters,
  });
  return response.data;
}

export async function createChoreography(
  data: ChoreographyFormData
): Promise<{ id: number; message: string }> {
  const response = await api.post('/choreographies', data);
  return response.data;
}

export async function updateChoreography(
  id: number,
  data: Partial<ChoreographyFormData>
): Promise<{ id: number; message: string }> {
  const response = await api.put(`/choreographies/${id}`, data);
  return response.data;
}

export async function deleteChoreography(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/choreographies/${id}`);
  return response.data;
}

export async function getLevels(): Promise<{ id: number; name: string }[]> {
  const response = await api.get('/levels');
  return response.data;
}

export async function getTags(): Promise<string[]> {
  const response = await api.get('/tags');
  return response.data;
}

export async function getAuthors(): Promise<string[]> {
  const response = await api.get('/authors');
  return response.data;
}

export async function addLevel(name: string): Promise<{ id: number; name: string }> {
  try {
    const response = await api.post('/levels', { name });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function getStepFigures(): Promise<string[]> {
  const response = await api.get('/step_figures');
  return response.data;
}

export async function getMaxChoreographyCount(): Promise<number> {
  const response = await api.get('/choreographies/max-count');
  return response.data?.max_count || 0;
}

export async function getSavedFilterConfigurations(): Promise<SavedFilterConfiguration[]> {
  const response = await api.get('/saved-filters');
  return response.data;
}

export async function saveFilterConfiguration(
  name: string,
  filters: SearchFilters
): Promise<SavedFilterConfiguration> {
  const response = await api.post('/saved-filters', { name, filters });
  return response.data;
}

export async function updateSavedFilterConfiguration(
  id: number,
  payload: {
    name?: string;
    filters?: SearchFilters;
  }
): Promise<SavedFilterConfiguration> {
  const response = await api.patch(`/saved-filters/${id}`, payload);
  return response.data;
}

export async function deleteSavedFilterConfiguration(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/saved-filters/${id}`);
  return response.data;
}
