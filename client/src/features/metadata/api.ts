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
