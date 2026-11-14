import { getChoreographyFieldIssues } from './validation.js';
import { prepareChoreography } from './write-operations.js';
import * as repository from './write-repository.js';

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

export async function validateChoreography(input, options) {
  const issues = getChoreographyFieldIssues(input, options);
  if (typeof input.level === 'string' && input.level.trim()) {
    if (!(await repository.findLevel(input.level))) {
      issues.push({ field: 'level', key: 'invalid_level' });
    }
  }
  return issues;
}

async function insertRelationships(id, kind, items) {
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

async function replaceRelationships(id, kind, items) {
  if (items === undefined) return;
  await repository.deleteRelationships(kind, id);
  await insertRelationships(id, kind, items);
}

async function replaceInformation(id, information) {
  await repository.deleteInformation(id);
  await information.reduce(
    (previous, item) =>
      previous.then(async () => {
        await repository.ensureInformationCategory(item.category);
        const category = await repository.findInformationCategory(item.category);
        await repository.insertInformation(id, category.id, item.description);
      }),
    Promise.resolve(),
  );
  await repository.deleteUnusedInformationCategories();
}

async function cleanupOrphanedRecords() {
  await repository.deleteUnusedAuthors();
  await repository.deleteUnusedTags();
  await repository.deleteOrphanedInformation();
  await repository.deleteUnusedInformationCategories();
  await repository.deleteUnusedLevels(canonicalLevels);
  await repository.deleteOrphanedRelationships('authors');
  await repository.deleteOrphanedRelationships('tags');
  await repository.deleteOrphanedRelationships('figures');
  await repository.deleteOrphanedFigureComponents();
}

function invalidLevel() {
  return { error: 'validation', issues: [{ field: 'level', key: 'invalid_level' }] };
}

export async function createChoreography(input) {
  const issues = await validateChoreography(input);
  if (issues.length) return { error: 'validation', issues };
  const prepared = prepareChoreography(input);
  return repository.withChoreographyTransaction(async () => {
    const level = await repository.findLevel(prepared.level);
    if (!level) return invalidLevel();
    const result = await repository.insertChoreography(prepared, level.id);
    await insertRelationships(result.id, 'authors', prepared.authors);
    await insertRelationships(result.id, 'figures', prepared.step_figures);
    await insertRelationships(result.id, 'tags', prepared.tags);
    await replaceInformation(result.id, prepared.information || []);
    return { value: result.id };
  });
}

export async function updateChoreography(id, input) {
  if (!(await repository.findChoreography(id))) return { error: 'not_found' };
  const issues = await validateChoreography(input, { partial: true });
  if (issues.length) return { error: 'validation', issues };
  const prepared = prepareChoreography(input);
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
    if (prepared.information !== undefined) await replaceInformation(id, prepared.information);
    await cleanupOrphanedRecords();
    return { value: true };
  });
}

export async function deleteChoreography(id) {
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
