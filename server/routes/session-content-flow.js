import { withTransaction } from '../scripts/db.js';
import { clearAutomaticRepetitions, distributeRepetitions } from './session-repetitions.js';
import {
  getSessionsForRearrangement,
  moveSessionComments,
  restoreSessionChoreographies,
  takeSessionChoreographies,
} from './session-content-repository.js';

const dbName = 'danceGroups';

async function moveContents(sessions, targets) {
  const sessionIds = sessions.map((session) => session.id);
  await clearAutomaticRepetitions(sessions[0].dance_course_id);
  const choreographies = await takeSessionChoreographies(sessionIds);
  await moveSessionComments(sessions, targets);
  await restoreSessionChoreographies(choreographies, targets);
  await distributeRepetitions(sessions[0].dance_course_id);
}

export async function rearrangeSessionContents(sessionIds, mode) {
  return withTransaction(dbName, async () => {
    const sessions = await getSessionsForRearrangement(sessionIds);
    if (sessions.length !== sessionIds.length) return 'not_found';
    if (sessions.some((session) => session.dance_course_id !== sessions[0].dance_course_id)) {
      return 'different_course';
    }

    const targets =
      mode === 'swap'
        ? new Map([
            [sessionIds[0], sessionIds[1]],
            [sessionIds[1], sessionIds[0]],
          ])
        : new Map(sessionIds.map((sourceId, index) => [sourceId, sessions[index].id]));
    await moveContents(sessions, targets);
    return 'ok';
  });
}
