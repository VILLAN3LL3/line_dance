import { httpClient } from "../../shared/http/httpClient";
import type { StepFigureDefinition, StepFigureOption } from "../../types";

const api = httpClient;

export async function getStepFiguresWithIds(): Promise<StepFigureOption[]> {
  const response = await api.get("/step_figures/with-ids");
  return response.data;
}

export async function getStepFigureHierarchy(): Promise<StepFigureDefinition[]> {
  const response = await api.get("/step_figures/hierarchy");
  return response.data;
}

export async function createStepFigureDefinition(payload: {
  name: string;
  component_ids: number[];
}): Promise<StepFigureDefinition> {
  const response = await api.post("/step_figures", payload);
  return response.data;
}

export async function updateStepFigureDefinition(
  id: number,
  payload: {
    name: string;
    component_ids: number[];
  },
): Promise<StepFigureDefinition> {
  const response = await api.put(`/step_figures/${id}`, payload);
  return response.data;
}

export async function deleteStepFigureDefinition(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/step_figures/${id}`);
  return response.data;
}
