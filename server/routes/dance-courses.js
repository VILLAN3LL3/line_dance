import * as courses from '../features/courses/flow.js';
import { captureDanceGroupError as captureError } from '../utils/danceGroupRouteErrors.js';

const courseErrors = {
  group_required: [400, 'Dance group ID is required'],
  course_identity_required: [400, 'Course ID or name is required'],
  group_not_found: [404, 'Dance group not found'],
  trainer_not_found: [404, 'Trainer not found'],
  course_not_found: [404, 'Dance course not found'],
  duplicate_course: [400, 'A course for this group and semester already exists'],
};

function sendCourseError(res, error) {
  const response = courseErrors[error];
  if (!response) throw new Error(`Unknown course error: ${error}`);
  return res.status(response[0]).json({ error: response[1] });
}

export async function getDanceCourses(req, res) {
  try {
    res.json(await courses.getCourses(req.query.dance_group_id));
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to fetch dance courses' });
  }
}

export async function createDanceCourse(req, res) {
  try {
    const result = await courses.createCourse(req.body);
    if (result.error) return sendCourseError(res, result.error);
    res.status(201).json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to create dance course' });
  }
}

export async function updateDanceCourse(req, res) {
  try {
    const result = await courses.updateCourse(req.params.id, req.body);
    if (result.error) return sendCourseError(res, result.error);
    res.json(result.value);
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to update dance course' });
  }
}

export async function deleteDanceCourse(req, res) {
  try {
    const result = await courses.deleteCourse(req.params.id);
    if (result.error) return sendCourseError(res, result.error);
    res.json({ message: 'Dance course deleted successfully' });
  } catch (error) {
    captureError(error);
    res.status(500).json({ error: 'Failed to delete dance course' });
  }
}
