import { hasTrainerId, validateCourseUpdate, validateNewCourse } from './validation.js';
import {
  deleteCourse as deleteCourseRecord,
  findCourse,
  findCourseIdentity,
  findGroup,
  findTrainer,
  insertCourse,
  listCourses,
  saveCourse,
  withCourseTransaction,
} from './repository.js';

export function getCourses(groupId) {
  return listCourses(groupId);
}

export async function createCourse(input) {
  const validation = validateNewCourse(input);
  if (validation.error) return validation;

  return withCourseTransaction(async () => {
    if (!(await findGroup(input.dance_group_id))) return { error: 'group_not_found' };
    if (hasTrainerId(input.trainer_id) && !(await findTrainer(input.trainer_id))) {
      return { error: 'trainer_not_found' };
    }
    const result = await insertCourse(validation.value);
    if (result.error) return result;
    return { value: await findCourse(result.id) };
  });
}

export async function updateCourse(id, input) {
  const { trainer_id } = input;
  return withCourseTransaction(async () => {
    const existing = await findCourseIdentity(id);
    if (!existing) return { error: 'course_not_found' };
    if (hasTrainerId(trainer_id) && !(await findTrainer(trainer_id))) {
      return { error: 'trainer_not_found' };
    }
    const validation = validateCourseUpdate(input, existing);
    if (validation.error) return validation;
    await saveCourse(id, validation.value);
    return { value: await findCourse(id) };
  });
}

export async function deleteCourse(id) {
  return (await deleteCourseRecord(id)) ? { value: true } : { error: 'course_not_found' };
}
