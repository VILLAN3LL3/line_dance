import { planRearrangement } from './operations.js';
import { withSessionTransaction } from './repository.js';
import { clearAutomaticRepetitions, distributeRepetitions } from './repetition-repository.js';
import {
  deleteSessionChoreographies,
  getSessionsForRearrangement,
  listSessionChoreographies,
  moveSessionComments,
  restoreSessionChoreographies,
} from './content-repository.js';

async function moveContents(sessions, { courseId, targets }) {
  const sessionIds = sessions.map((session) => session.id);
  await clearAutomaticRepetitions(courseId);
  const choreographies = await listSessionChoreographies(sessionIds);
  await deleteSessionChoreographies(sessionIds);
  await moveSessionComments(sessions, targets);
  await restoreSessionChoreographies(choreographies, targets);
  await distributeRepetitions(courseId);
}

export async function rearrangeSessionContents(sessionIds, mode) {
  return withSessionTransaction(async () => {
    const sessions = await getSessionsForRearrangement(sessionIds);
    const plan = planRearrangement(sessionIds, sessions, mode);
    if (plan.error) return plan;
    await moveContents(sessions, plan.value);
    return { value: true };
  });
}
