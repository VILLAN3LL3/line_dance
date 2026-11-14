import { planRearrangement } from './operations.ts';
import type { RearrangementMode, RearrangementPlan } from './operations.ts';
import { withSessionTransaction } from './repository.js';
import { clearAutomaticRepetitions, distributeRepetitions } from './repetition-repository.ts';
import {
  deleteSessionChoreographies,
  getSessionsForRearrangement,
  listSessionChoreographies,
  moveSessionComments,
  restoreSessionChoreographies,
} from './content-repository.ts';
import type { SessionContent } from './content-repository.ts';

async function moveContents(
  sessions: SessionContent[],
  { courseId, targets }: RearrangementPlan,
): Promise<void> {
  const sessionIds = sessions.map((session) => session.id);
  await clearAutomaticRepetitions(courseId);
  const choreographies = await listSessionChoreographies(sessionIds);
  await deleteSessionChoreographies(sessionIds);
  await moveSessionComments(sessions, targets);
  await restoreSessionChoreographies(choreographies, targets);
  await distributeRepetitions(courseId);
}

export async function rearrangeSessionContents(
  sessionIds: number[],
  mode: RearrangementMode,
): Promise<{ error: 'session_not_found' | 'different_course' } | { value: true }> {
  return withSessionTransaction(async () => {
    const sessions = await getSessionsForRearrangement(sessionIds);
    const plan = planRearrangement(sessionIds, sessions, mode);
    if ('error' in plan) return plan;
    await moveContents(sessions, plan.value);
    return { value: true };
  });
}
