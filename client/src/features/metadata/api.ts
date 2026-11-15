import { getApiErrorMessage } from "../../shared/http/apiErrors";
import { httpClient } from "../../shared/http/httpClient";
import type { LevelOption } from "../../types";

export async function getLevels(): Promise<LevelOption[]> {
  const response = await httpClient.get("/levels");
  return response.data;
}

export async function getTags(): Promise<string[]> {
  const response = await httpClient.get("/tags");
  return response.data;
}

export async function getAuthors(): Promise<string[]> {
  const response = await httpClient.get("/authors");
  return response.data;
}

export async function getStepFigures(): Promise<string[]> {
  const response = await httpClient.get("/step_figures");
  return response.data;
}

export async function getCountryCodes(): Promise<Record<string, string>> {
  const response = await httpClient.get("/country-codes");
  return response.data;
}

export async function getChoreographyInfoCategories(): Promise<string[]> {
  const response = await httpClient.get("/choreography-info-categories");
  return response.data;
}

export async function addLevel(name: string): Promise<{ id: number; name: string; value: number }> {
  try {
    const response = await httpClient.post("/levels", { name });
    return response.data;
  } catch (error) {
    const message = getApiErrorMessage(error);
    if (message) throw new Error(message);
    throw error;
  }
}
