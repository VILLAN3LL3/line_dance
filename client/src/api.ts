import axios from "axios";

import {
  DanceCourse,
  DanceGroup,
  LearnedChoreography,
  SavedFilterConfiguration,
  SearchFilters,
  Session,
  SessionChoreography,
  SessionStepFigureSuggestionsResult,
  StepFigureDefinition,
  StepFigureOption,
  StepFigureSuggestion,
} from "./types";
import { httpClient as api } from "./shared/http/httpClient";

// Temporary facade: features migrated to `features/<name>/` re-export here until their consumers migrate.
export * from "./features/trainers/api";
export * from "./features/choreographies/api";
export * from "./features/metadata/api";

export async function getChoreographyInfoCategories(): Promise<string[]> {
  const response = await api.get("/choreography-info-categories");
  return response.data;
}

export async function getAuthorStats(): Promise<import("./types").AuthorStats[]> {
  const response = await api.get("/authors/stats");
  return response.data;
}

export async function addLevel(name: string): Promise<{ id: number; name: string; value: number }> {
  try {
    const response = await api.post("/levels", { name });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function getStepFiguresWithIds(): Promise<StepFigureOption[]> {
  const response = await api.get("/step_figures/with-ids");
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

export async function getSavedFilterConfigurations(): Promise<SavedFilterConfiguration[]> {
  const response = await api.get("/saved-filters");
  return response.data;
}

export async function saveFilterConfiguration(
  name: string,
  filters: SearchFilters,
): Promise<SavedFilterConfiguration> {
  const response = await api.post("/saved-filters", { name, filters });
  return response.data;
}

export async function updateSavedFilterConfiguration(
  id: number,
  payload: {
    name?: string;
    filters?: SearchFilters;
  },
): Promise<SavedFilterConfiguration> {
  const response = await api.patch(`/saved-filters/${id}`, payload);
  return response.data;
}

export async function deleteSavedFilterConfiguration(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/saved-filters/${id}`);
  return response.data;
}

export async function checkUrl(url: string): Promise<{ ok: boolean; status: number | null }> {
  const response = await api.get("/url-check", { params: { url } });
  return response.data;
}

// Dance Groups API

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

// Dance Courses API

export async function getDanceCourses(danceGroupId?: number): Promise<DanceCourse[]> {
  const response = await api.get("/dance-courses", {
    params: danceGroupId ? { dance_group_id: danceGroupId } : {},
  });
  return response.data;
}

export async function createDanceCourse(payload: {
  danceGroupId: number;
  semester?: string;
  name?: string;
  startDate?: string;
  courseId?: number;
  youtubePlaylistUrl?: string;
  copperknobListUrl?: string;
  spotifyPlaylistUrl?: string;
  trainerId?: number;
}): Promise<DanceCourse> {
  const response = await api.post("/dance-courses", {
    course_id: payload.courseId,
    name: payload.name,
    dance_group_id: payload.danceGroupId,
    semester: payload.semester,
    start_date: payload.startDate,
    youtube_playlist_url: payload.youtubePlaylistUrl,
    copperknob_list_url: payload.copperknobListUrl,
    spotify_playlist_url: payload.spotifyPlaylistUrl,
    trainer_id: payload.trainerId ?? null,
  });
  return response.data;
}

export async function updateDanceCourse(
  id: number,
  payload: {
    semester?: string;
    name?: string;
    startDate?: string;
    youtubePlaylistUrl?: string;
    copperknobListUrl?: string;
    spotifyPlaylistUrl?: string;
    trainerId?: number;
    courseId?: number;
  },
): Promise<DanceCourse> {
  const response = await api.put(`/dance-courses/${id}`, {
    semester: payload.semester,
    name: payload.name,
    course_id: payload.courseId,
    start_date: payload.startDate,
    youtube_playlist_url: payload.youtubePlaylistUrl,
    copperknob_list_url: payload.copperknobListUrl,
    spotify_playlist_url: payload.spotifyPlaylistUrl,
    trainer_id: payload.trainerId ?? null,
  });
  return response.data;
}

export async function deleteDanceCourse(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/dance-courses/${id}`);
  return response.data;
}

export async function exportDanceCoursePdf(id: number): Promise<Blob> {
  const response = await api.get(`/dance-courses/${id}/export-pdf`, {
    responseType: "blob",
  });
  return response.data;
}

// Sessions API

export async function getSessions(danceCoursesId?: number): Promise<Session[]> {
  const response = await api.get("/sessions", {
    params: danceCoursesId ? { dance_course_id: danceCoursesId } : {},
  });
  return response.data;
}

export async function createSession(
  danceCourseId: number,
  sessionDate: string,
  comment?: string,
): Promise<Session> {
  const response = await api.post("/sessions", {
    dance_course_id: danceCourseId,
    session_date: sessionDate,
    comment: comment ?? null,
  });
  return response.data;
}

export async function updateSession(
  id: number,
  sessionDate: string,
  comment?: string | null,
): Promise<Session> {
  const response = await api.put(`/sessions/${id}`, {
    session_date: sessionDate,
    comment: comment ?? null,
  });
  return response.data;
}

export async function deleteSession(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/sessions/${id}`);
  return response.data;
}

// Session Choreographies API

export async function getSessionChoreographies(sessionId: number): Promise<SessionChoreography[]> {
  const response = await api.get("/session-choreographies", {
    params: { session_id: sessionId },
  });
  return response.data;
}

export async function addChoreographyToSession(
  sessionId: number,
  choreographyId: number,
): Promise<SessionChoreography> {
  const response = await api.post("/session-choreographies", {
    session_id: sessionId,
    choreography_id: choreographyId,
  });
  return response.data;
}

export async function removeChoreographyFromSession(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/session-choreographies/${id}`);
  return response.data;
}

export async function reorderSessionContents(sessionIds: number[]): Promise<{ message: string }> {
  const response = await api.post("/sessions/reorder-contents", { session_ids: sessionIds });
  return response.data;
}

export async function swapSessions(
  sessionId: number,
  targetSessionId: number,
): Promise<{ message: string }> {
  const response = await api.post(`/sessions/${sessionId}/swap/${targetSessionId}`);
  return response.data;
}

export async function getSessionStepFigureSuggestions(
  sessionId: number,
): Promise<SessionStepFigureSuggestionsResult> {
  const response = await api.get(`/sessions/${sessionId}/step-figure-suggestions`);
  return response.data;
}

// Learned Choreographies API

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

// Group Levels API

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
