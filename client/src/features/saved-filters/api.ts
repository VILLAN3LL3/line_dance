import { httpClient } from "../../shared/http/httpClient";
import type { SavedFilterConfiguration, SearchFilters } from "../../types";

export async function getSavedFilterConfigurations(): Promise<SavedFilterConfiguration[]> {
  const response = await httpClient.get("/saved-filters");
  return response.data;
}

export async function saveFilterConfiguration(
  name: string,
  filters: SearchFilters,
): Promise<SavedFilterConfiguration> {
  const response = await httpClient.post("/saved-filters", { name, filters });
  return response.data;
}

export async function updateSavedFilterConfiguration(
  id: number,
  payload: {
    name?: string;
    filters?: SearchFilters;
  },
): Promise<SavedFilterConfiguration> {
  const response = await httpClient.patch(`/saved-filters/${id}`, payload);
  return response.data;
}

export async function deleteSavedFilterConfiguration(id: number): Promise<{ message: string }> {
  const response = await httpClient.delete(`/saved-filters/${id}`);
  return response.data;
}
