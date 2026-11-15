import { hasTrainerId, validateCourseUpdate } from './validation.ts';
import type { CourseInput, NewCourse } from './validation.ts';
import {
  deleteCourse as deleteCourseRecord,
  findCourse,
  findCourseIdentity,
  findGroup,
  findNamedCourse,
  findTrainer,
  insertCourse,
  listCourses,
  saveCourse,
  withCourseTransaction,
} from './repository.ts';
import type { Course } from './repository.ts';

type CourseError =
  | 'group_required'
  | 'course_identity_required'
  | 'group_not_found'
  | 'trainer_not_found'
  | 'course_not_found'
  | 'duplicate_name'
  | 'duplicate_course';
export type CourseResult = { error: CourseError } | { value: Course | undefined };

export async function getCourses(groupId: CourseInput['dance_group_id']): Promise<Course[]> {
  return listCourses(groupId);
}

export async function createCourse({ input, validation }: NewCourse): Promise<CourseResult> {
  if ('error' in validation) return validation;

  return withCourseTransaction(async () => {
    if (!(await findGroup(input.dance_group_id))) return { error: 'group_not_found' };
    if (hasTrainerId(input.trainer_id) && !(await findTrainer(input.trainer_id))) {
      return { error: 'trainer_not_found' };
    }
    if (
      validation.value.course_id === null &&
      (await findNamedCourse(
        input.dance_group_id,
        validation.value.semester,
        validation.value.name,
        null,
      ))
    ) {
      return { error: 'duplicate_name' };
    }
    const result = await insertCourse(validation.value);
    if ('error' in result) return result;
    return { value: await findCourse(result.id) };
  });
}

export async function updateCourse(id: string | number, input: CourseInput): Promise<CourseResult> {
  const { trainer_id } = input;
  return withCourseTransaction(async () => {
    const existing = await findCourseIdentity(id);
    if (!existing) return { error: 'course_not_found' };
    if (hasTrainerId(trainer_id) && !(await findTrainer(trainer_id))) {
      return { error: 'trainer_not_found' };
    }
    const validation = validateCourseUpdate(input, existing);
    if ('error' in validation) return validation;
    if (
      validation.value.course_id === null &&
      (await findNamedCourse(
        existing.dance_group_id,
        validation.value.semester,
        validation.value.name,
        id,
      ))
    ) {
      return { error: 'duplicate_name' };
    }
    const saved = await saveCourse(id, validation.value);
    if ('error' in saved) return saved;
    return { value: await findCourse(id) };
  });
}

export async function deleteCourse(
  id: string | number,
): Promise<{ value: true } | { error: 'course_not_found' }> {
  return (await deleteCourseRecord(id)) ? { value: true } : { error: 'course_not_found' };
}
