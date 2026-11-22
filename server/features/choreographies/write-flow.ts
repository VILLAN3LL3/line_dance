import type { JsonValue } from '../../utils/json-input.ts';
import type { ChoreographyIssue, PreparedWriteRequest, WriteRequest } from './validation.ts';
import { prepareChoreography } from './write-operations.ts';
import type { Information } from './write-operations.ts';
import * as repository from './write-repository.ts';
import type { RelationshipKind } from './write-repository.ts';

type ChoreographyId = string | number;
type ValidationError = { error: 'validation'; issues: ChoreographyIssue[] };
type WriteResult<T> = { value: T } | ValidationError | { error: 'not_found' };

const canonicalLevels = [
  'UNKNOWN',
  'ABSOLUTE BEGINNER',
  'EASY BEGINNER',
  'BEGINNER',
  'HIGH BEGINNER',
  'LOW IMPROVER',
  'EASY IMPROVER',
  'IMPROVER',
  'HIGH IMPROVER',
  'LOW INTERMEDIATE',
  'EASY INTERMEDIATE',
  'INTERMEDIATE',
  'HIGH INTERMEDIATE',
  'LOW ADVANCED',
  'EASY ADVANCED',
  'ADVANCED',
  'HIGH ADVANCED',
];

export async function validateChoreography({
  input,
  issues: fieldIssues,
}: WriteRequest): Promise<ChoreographyIssue[]> {
  const issues = [...fieldIssues];
  if (typeof input.level === 'string' && input.level.trim()) {
    if (!(await repository.findLevel(input.level))) {
      issues.push({ field: 'level', key: 'invalid_level' });
    }
  }
  return issues;
}

async function insertRelationships(
  id: ChoreographyId,
  kind: RelationshipKind,
  items: JsonValue | undefined,
): Promise<void> {
  if (!items || !Array.isArray(items)) return;
  await items.reduce(
    (previous, item) =>
      previous.then(async () => {
        const existing = await repository.findRelatedEntity(kind, item);
        const entityId = existing?.id || (await repository.insertRelatedEntity(kind, item)).id;
        await repository.insertRelationship(kind, id, entityId);
      }),
    Promise.resolve(),
  );
}

async function replaceRelationships(
  id: ChoreographyId,
  kind: RelationshipKind,
  items: JsonValue | undefined,
): Promise<void> {
  if (items === undefined) return;
  await repository.deleteRelationships(kind, id);
  await insertRelationships(id, kind, items);
}

async function replaceInformation(id: ChoreographyId, information: Information[]): Promise<void> {
  await repository.deleteInformation(id);
  await information.reduce(
    (previous, item) =>
      previous.then(async () => {
        await repository.ensureInformationCategory(item.category);
        const category = await repository.findInformationCategory(item.category);
        if (!category) throw new Error('Choreography information category not found');
        await repository.insertInformation(id, category.id, item.description);
      }),
    Promise.resolve(),
  );
  await repository.deleteUnusedInformationCategories();
}

async function cleanupOrphanedRecords(): Promise<void> {
  await repository.deleteUnusedAuthors();
  await repository.deleteUnusedTags();
  await repository.deleteOrphanedInformation();
  await repository.deleteUnusedInformationCategories();
  await repository.deleteOrphanedPersonalLevels();
  await repository.deleteUnusedLevels(canonicalLevels);
  await repository.deleteOrphanedRelationships('authors');
  await repository.deleteOrphanedRelationships('tags');
  await repository.deleteOrphanedRelationships('figures');
  await repository.deleteOrphanedFigureComponents();
}

function invalidLevel(): ValidationError {
  return { error: 'validation', issues: [{ field: 'level', key: 'invalid_level' }] };
}

export async function createChoreography(
  request: WriteRequest<false>,
): Promise<WriteResult<number>> {
  const issues = await validateChoreography(request);
  if (issues.length) return { error: 'validation', issues };
  const prepared = prepareChoreography(request.input);
  const information = prepared.information;
  if (information === null) throw new Error('Invalid choreography information');
  return repository.withChoreographyTransaction(async () => {
    const level = await repository.findLevel(prepared.level);
    if (!level) return invalidLevel();
    const result = await repository.insertChoreography(prepared, level.id);
    await insertRelationships(result.id, 'authors', prepared.authors);
    await insertRelationships(result.id, 'figures', prepared.step_figures);
    await insertRelationships(result.id, 'tags', prepared.tags);
    await replaceInformation(result.id, information ?? []);
    return { value: result.id };
  });
}

export async function updateChoreography(
  id: ChoreographyId,
  request: PreparedWriteRequest,
): Promise<WriteResult<number>> {
  const choreography = await repository.findChoreography(id);
  if (!choreography) return { error: 'not_found' };
  if ('exception' in request) throw request.exception;
  const issues = await validateChoreography(request);
  if (issues.length) return { error: 'validation', issues };
  const prepared = prepareChoreography(request.input);
  const information = prepared.information;
  if (information === null) throw new Error('Invalid choreography information');
  return repository.withChoreographyTransaction(async () => {
    if (!(await repository.findChoreography(id))) return { error: 'not_found' };
    let levelId = null;
    if (prepared.level) {
      const level = await repository.findLevel(prepared.level);
      if (!level) return invalidLevel();
      levelId = level.id;
    }
    await repository.updateChoreography(id, prepared, levelId);
    await replaceRelationships(id, 'authors', prepared.authors);
    await replaceRelationships(id, 'figures', prepared.step_figures);
    await replaceRelationships(id, 'tags', prepared.tags);
    if (information !== undefined) await replaceInformation(id, information);
    await cleanupOrphanedRecords();
    return { value: choreography.id };
  });
}

export async function deleteChoreography(id: ChoreographyId): Promise<WriteResult<true>> {
  return repository.withChoreographyTransaction(async () => {
    await repository.deleteInformation(id);
    await repository.deleteRelationships('authors', id);
    await repository.deleteRelationships('tags', id);
    await repository.deleteRelationships('figures', id);
    const deleted = await repository.deleteChoreography(id);
    if (deleted.changes === 0) return { error: 'not_found' };
    await cleanupOrphanedRecords();
    return { value: true };
  });
}
