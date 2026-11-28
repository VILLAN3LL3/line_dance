import { httpClient } from "../../shared/http/httpClient";
import type {
  DanceCourse,
  Session,
  SessionChoreography,
  SessionStepFigureSuggestionsResult,
} from "../../types";

const api = httpClient;

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

export async function exportParticipantCoursePdf(id: number): Promise<Blob> {
  const response = await api.get(`/dance-courses/${id}/export-participant-pdf`, {
    responseType: "blob",
  });
  return response.data;
}

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

/** `null` restores the default song (favorite, otherwise the first song). */
export async function chooseSessionChoreographySong(
  id: number,
  songId: number | null,
): Promise<SessionChoreography> {
  const response = await api.patch(`/session-choreographies/${id}`, { song_id: songId });
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
  music?: { minBpm: number | null; maxBpm: number | null; genres: string[] },
): Promise<SessionStepFigureSuggestionsResult> {
  const response = await api.get(`/sessions/${sessionId}/step-figure-suggestions`, {
    params: {
      ...(music?.minBpm == null ? {} : { min_bpm: music.minBpm }),
      ...(music?.maxBpm == null ? {} : { max_bpm: music.maxBpm }),
      ...(music?.genres.length ? { genres: music.genres } : {}),
    },
  });
  return response.data;
}
