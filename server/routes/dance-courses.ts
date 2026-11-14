import type { Request, Response } from 'express';
import * as courses from '../features/courses/flow.ts';
import {
  prepareCourseFilter,
  prepareCourseInput,
  prepareNewCourse,
} from '../features/courses/validation.ts';
import type { CourseInput, NewCourse } from '../features/courses/validation.ts';
import { prepareInput } from './prepare-input.ts';
import type { PreparedInput } from './prepare-input.ts';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.ts';

type CourseError = Extract<courses.CourseResult, { error: string }>['error'];
type Course = Awaited<ReturnType<typeof courses.getCourses>>[number];
type ErrorResponse = { error: string };
type CourseResponse = Course | undefined | ErrorResponse;
type DeleteResponse = { message: 'Dance course deleted successfully' } | ErrorResponse;
type CourseFilter = ReturnType<typeof prepareCourseFilter>;

const courseErrors: Record<CourseError, [number, string]> = {
  group_required: [400, 'Dance group ID is required'],
  course_identity_required: [400, 'Course ID or name is required'],
  group_not_found: [404, 'Dance group not found'],
  trainer_not_found: [404, 'Trainer not found'],
  course_not_found: [404, 'Dance course not found'],
  duplicate_course: [400, 'A course for this group and semester already exists'],
};

function sendCourseError<T>(
  res: Response<T | ErrorResponse>,
  error: CourseError,
): Response<T | ErrorResponse> {
  const response = courseErrors[error];
  if (!response) throw new Error(`Unknown course error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export const prepareFilter = prepareInput((req) => req.query, prepareCourseFilter);
export const prepareCreate = prepareInput((req) => req.body, prepareNewCourse);
export const prepareUpdate = prepareInput((req) => req.body, prepareCourseInput);

export async function getDanceCourses(
  _req: Request,
  res: Response<Course[] | ErrorResponse, { input: PreparedInput<CourseFilter> }>,
): Promise<void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    res.json(await courses.getCourses(input.value));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance courses' });
  }
}

export async function createDanceCourse(
  _req: Request,
  res: Response<CourseResponse, { input: PreparedInput<NewCourse> }>,
): Promise<Response<CourseResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await courses.createCourse(input);
    if ('error' in result) return sendCourseError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create dance course' });
  }
}

export async function updateDanceCourse(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<CourseResponse, { input: PreparedInput<CourseInput> }>,
): Promise<Response<CourseResponse> | void> {
  try {
    const input = res.locals.input;
    if ('exception' in input) throw input.exception;
    const result = await courses.updateCourse(req.params.id, input);
    if ('error' in result) return sendCourseError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update dance course' });
  }
}

export async function deleteDanceCourse(
  req: Pick<Request<{ id: string }>, 'params'>,
  res: Response<DeleteResponse>,
): Promise<Response<DeleteResponse> | void> {
  try {
    const result = await courses.deleteCourse(req.params.id);
    if ('error' in result) return sendCourseError(res, result.error);
    res.json({ message: 'Dance course deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete dance course' });
  }
}
