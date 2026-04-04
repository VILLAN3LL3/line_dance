import { APIRequestContext, expect } from "@playwright/test";

export const API_BASE = "http://127.0.0.1:3101/api";

async function expectOk(response: Awaited<ReturnType<APIRequestContext["post"]>>) {
  expect(response.ok()).toBeTruthy();
}

export async function createChoreographyViaApi(request: APIRequestContext, name: string) {
  const response = await request.post(`${API_BASE}/choreographies`, {
    data: {
      name,
      level: "Beginner",
      authors: ["E2E API Author"],
      tags: ["E2E-API"],
      step_figures: ["Vine"],
      count: 32,
      wall_count: 4,
    },
  });

  await expectOk(response);
  const body = await response.json();
  return body.id as number;
}

export async function createDanceGroupViaApi(request: APIRequestContext, name: string) {
  const response = await request.post(`${API_BASE}/dance-groups`, {
    data: { name },
  });

  await expectOk(response);
  const body = await response.json();
  return body.id as number;
}

export async function createTrainerViaApi(
  request: APIRequestContext,
  name: string,
  email: string,
  phone = "+1 555 000 0000",
) {
  const response = await request.post(`${API_BASE}/trainers`, {
    data: { name, email, phone },
  });

  await expectOk(response);
  const body = await response.json();
  return body.id as number;
}

export async function createDanceCourseViaApi(
  request: APIRequestContext,
  danceGroupId: number,
  semester: string,
  startDate: string,
  trainerId?: number,
) {
  const response = await request.post(`${API_BASE}/dance-courses`, {
    data: {
      dance_group_id: danceGroupId,
      semester,
      start_date: startDate,
      trainer_id: trainerId ?? null,
    },
  });

  await expectOk(response);
  const body = await response.json();
  return body.id as number;
}

export async function createSessionViaApi(
  request: APIRequestContext,
  danceCourseId: number,
  sessionDate: string,
) {
  const response = await request.post(`${API_BASE}/sessions`, {
    data: {
      dance_course_id: danceCourseId,
      session_date: sessionDate,
    },
  });

  await expectOk(response);
  const body = await response.json();
  return body.id as number;
}

export async function addSessionChoreographyViaApi(
  request: APIRequestContext,
  sessionId: number,
  choreographyId: number,
) {
  const response = await request.post(`${API_BASE}/session-choreographies`, {
    data: {
      session_id: sessionId,
      choreography_id: choreographyId,
    },
  });

  await expectOk(response);
}

export async function addGroupLevelViaApi(
  request: APIRequestContext,
  danceGroupId: number,
  level: string,
) {
  const response = await request.post(`${API_BASE}/dance-groups/${danceGroupId}/levels`, {
    data: { level },
  });

  await expectOk(response);
}
