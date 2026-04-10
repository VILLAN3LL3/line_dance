import axios from "axios";

import {
  Choreography, ChoreographyFormData, DanceCourse, DanceGroup, LearnedChoreography, PaginatedResponse, SavedFilterConfiguration,
  SearchFilters, Session, SessionChoreography
} from "./types";

import type { Trainer } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_URL,
});

const inFlightChoreographySearches = new Map<string, Promise<PaginatedResponse<Choreography>>>();

function buildSearchRequestKey(filters: SearchFilters): string {
  const entries = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right));

  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=[${value.join(",")}]`;
      }
      return `${key}=${String(value)}`;
    })
    .join("&");
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

export async function searchChoreographies(
  filters: SearchFilters,
): Promise<PaginatedResponse<Choreography>> {
  const requestKey = buildSearchRequestKey(filters);
  const existingRequest = inFlightChoreographySearches.get(requestKey);
  if (existingRequest !== undefined) {
    return existingRequest;
  }

  const request = api
    .get("/choreographies/search", {
      params: filters,
    })
    .then((response) => response.data)
    .finally(() => {
      inFlightChoreographySearches.delete(requestKey);
    });

  inFlightChoreographySearches.set(requestKey, request);
  return request;
}

export async function createChoreography(
  data: ChoreographyFormData,
): Promise<{ id: number; message: string }> {
  const response = await api.post("/choreographies", data);
  return response.data;
}

export async function updateChoreography(
  id: number,
  data: Partial<ChoreographyFormData>,
): Promise<{ id: number; message: string }> {
  const response = await api.put(`/choreographies/${id}`, data);
  return response.data;
}

export async function deleteChoreography(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/choreographies/${id}`);
  return response.data;
}

export async function getLevels(): Promise<{ id: number; name: string; value: number }[]> {
  const response = await api.get("/levels");
  return response.data;
}

export async function getTags(): Promise<string[]> {
  const response = await api.get("/tags");
  return response.data;
}

export async function getAuthors(): Promise<string[]> {
  const response = await api.get("/authors");
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

export async function getStepFigures(): Promise<string[]> {
  const response = await api.get("/step_figures");
  return response.data;
}

export async function getMaxChoreographyCount(): Promise<number> {
  const response = await api.get("/choreographies/max-count");
  return response.data?.max_count || 0;
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

// Trainers API

export async function getTrainers(): Promise<Trainer[]> {
  const response = await api.get("/trainers");
  return response.data;
}

export async function createTrainer(name: string, phone: string, email: string): Promise<Trainer> {
  const response = await api.post("/trainers", { name, phone, email });
  return response.data;
}

export async function updateTrainer(
  id: number,
  name: string,
  phone: string,
  email: string,
): Promise<Trainer> {
  const response = await api.put(`/trainers/${id}`, { name, phone, email });
  return response.data;
}

export async function deleteTrainer(id: number): Promise<{ message: string }> {
  const response = await api.delete(`/trainers/${id}`);
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
  semester: string;
  startDate?: string;
  id?: number;
  youtubePlaylistUrl?: string;
  copperknobListUrl?: string;
  spotifyPlaylistUrl?: string;
  trainerId?: number;
}): Promise<DanceCourse> {
  const response = await api.post("/dance-courses", {
    id: payload.id,
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
  semester: string,
  startDate?: string,
  youtubePlaylistUrl?: string,
  copperknobListUrl?: string,
  spotifyPlaylistUrl?: string,
  trainerId?: number,
): Promise<DanceCourse> {
  const response = await api.put(`/dance-courses/${id}`, {
    semester,
    start_date: startDate,
    youtube_playlist_url: youtubePlaylistUrl,
    copperknob_list_url: copperknobListUrl,
    spotify_playlist_url: spotifyPlaylistUrl,
    trainer_id: trainerId ?? null,
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

export async function createSession(danceCourseId: number, sessionDate: string): Promise<Session> {
  const response = await api.post("/sessions", {
    dance_course_id: danceCourseId,
    session_date: sessionDate,
  });
  return response.data;
}

export async function updateSession(id: number, sessionDate: string): Promise<Session> {
  const response = await api.put(`/sessions/${id}`, { session_date: sessionDate });
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

// Learned Choreographies API

export async function getLearnedChoreographies(
  danceGroupId?: number,
): Promise<LearnedChoreography[]> {
  const response = await api.get("/learned-choreographies", {
    params: danceGroupId ? { dance_group_id: danceGroupId } : {},
  });
  return response.data;
}

// Group Levels API

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
