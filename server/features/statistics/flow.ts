import type { RepertoireStatistics } from '../../contracts/api.ts';
import { buildRepertoireStatistics } from './operations.ts';
import * as statistics from './repository.ts';

export async function getRepertoireStatistics(): Promise<RepertoireStatistics> {
  const [rows, authors, practiceMonths] = await Promise.all([
    statistics.listLearnedRows(),
    statistics.listLearnedAuthors(),
    statistics.listPracticeMonths(),
  ]);
  return buildRepertoireStatistics(rows, authors, practiceMonths);
}
