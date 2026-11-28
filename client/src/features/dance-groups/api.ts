import { httpClient } from "../../shared/http/httpClient";
import type {
  DanceGroup,
  LearnedChoreography,
  StepFigureOption,
  StepFigureSuggestion,
} from "../../types";

const api = httpClient;

export async function getDanceGroups(): Promise<DanceGroup[]> {
  const response = await api.get("/dance-groups");
  return response.data;
}

export async function getDanceGroup(id: number): Promise<DanceGroup> {
  const response = await api.get(`/dance-groups/${id}`);
  return response.data;
}

export async function createDanceGroup(name: string): Promise<DanceGroup> {
  const response = await api.post("/dance-groups", { name });
  return response.data;
}

export async function updateDanceGroup(id: number, name: string): Promise<DanceGroup> {
  const response = await api.put(`/dance-groups/${id}`, { name });
  return response.data;
}

export async function deleteDanceGroup(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/dance-groups/${id}`);
  return response.data;
}
export async function getLearnedChoreographies(
  danceGroupId?: number,
): Promise<LearnedChoreography[]> {
  const response = await api.get("/learned-choreographies", {
    params: danceGroupId ? { dance_group_id: danceGroupId } : {},
  });
  return response.data;
}

export async function getStepFigureSuggestions(
  groupId: number,
  maxLevelValue?: number | null,
): Promise<StepFigureSuggestion[]> {
  const response = await api.get(`/dance-groups/${groupId}/step-figure-suggestions`, {
    params: maxLevelValue == null ? {} : { max_level_value: maxLevelValue },
  });
  return response.data;
}

export async function getGroupMaxLevel(
  groupId: number,
): Promise<{ max_group_level_value: number | null }> {
  const response = await api.get(`/dance-groups/${groupId}/max-level`);
  return response.data;
}

export async function updateGroupMaxLevel(
  groupId: number,
  maxGroupLevelValue: number | null,
): Promise<{ max_group_level_value: number | null }> {
  const response = await api.put(`/dance-groups/${groupId}/max-level`, {
    max_group_level_value: maxGroupLevelValue,
  });
  return response.data;
}

export async function getGroupLevels(groupId: number): Promise<string[]> {
  const response = await api.get(`/dance-groups/${groupId}/levels`);
  return response.data;
}

export async function addGroupLevel(groupId: number, level: string): Promise<{ level: string }> {
  const response = await api.post(`/dance-groups/${groupId}/levels`, { level });
  return response.data;
}

export async function removeGroupLevel(
  groupId: number,
  level: string,
): Promise<{ message: string }> {
  const response = await api.delete(`/dance-groups/${groupId}/levels/${encodeURIComponent(level)}`);
  return response.data;
}

export async function getGroupBaseStepFigures(groupId: number): Promise<StepFigureOption[]> {
  const response = await api.get(`/dance-groups/${groupId}/base-step-figures`);
  return response.data;
}

export async function updateGroupBaseStepFigures(
  groupId: number,
  stepFigureIds: number[],
): Promise<StepFigureOption[]> {
  const response = await api.put(`/dance-groups/${groupId}/base-step-figures`, {
    step_figure_ids: stepFigureIds,
  });
  return response.data;
}
