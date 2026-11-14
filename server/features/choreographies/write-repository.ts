import { getQuery, runQuery, withTransaction } from '../../scripts/db.ts';
import type { WriteResult } from '../../scripts/db.ts';
import type { JsonValue } from '../../utils/json-input.ts';
import type { prepareChoreography } from './write-operations.ts';

export type RelationshipKind = 'authors' | 'figures' | 'tags';
type ChoreographyId = string | number;
type PreparedChoreography = ReturnType<typeof prepareChoreography>;

const relationships: Record<RelationshipKind, { entities: string; links: string; id: string }> = {
  authors: { entities: 'authors', links: 'choreography_authors', id: 'author_id' },
  figures: { entities: 'step_figures', links: 'choreography_step_figures', id: 'step_figure_id' },
  tags: { entities: 'personal_data.tags', links: 'personal_data.choreography_tags', id: 'tag_id' },
};

function relationship(kind: RelationshipKind): { entities: string; links: string; id: string } {
  const result = relationships[kind];
  if (!result) throw new Error(`Unknown choreography relationship: ${kind}`);
  return result;
}

export async function withChoreographyTransaction<T>(action: () => T | Promise<T>): Promise<T> {
  return withTransaction('choreography', action);
}

export async function findLevel(name: JsonValue | undefined): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [name]);
}

export async function findChoreography(id: ChoreographyId): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM choreographies WHERE id = ?', [id]);
}

export async function insertChoreography(
  input: PreparedChoreography,
  levelId: number,
): Promise<WriteResult> {
  return runQuery(
    `INSERT INTO choreographies (name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level_id, creation_year, song, artist)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.step_sheet_link,
      input.demo_video_url,
      input.tutorial_video_url,
      input.count,
      input.wall_count,
      levelId,
      input.creation_year,
      input.song,
      input.artist,
    ],
  );
}

export async function updateChoreography(
  id: ChoreographyId,
  input: PreparedChoreography,
  levelId: number | null,
): Promise<WriteResult> {
  const fields = [
    input.name,
    input.step_sheet_link,
    input.demo_video_url,
    input.tutorial_video_url,
    input.count,
    input.wall_count,
    input.creation_year,
    input.song,
    input.artist,
  ];
  const query = levelId
    ? `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, level_id = ?, creation_year = ?, song = ?, artist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    : `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, creation_year = ?, song = ?, artist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  const params = levelId
    ? [...fields.slice(0, 6), levelId, ...fields.slice(6), id]
    : [...fields, id];
  return runQuery(query, params);
}

export async function deleteChoreography(id: ChoreographyId): Promise<WriteResult> {
  return runQuery('DELETE FROM choreographies WHERE id = ?', [id]);
}

export async function findRelatedEntity(
  kind: RelationshipKind,
  name: JsonValue,
): Promise<{ id: number } | undefined> {
  const { entities } = relationship(kind);
  return getQuery<{ id: number }>(`SELECT id FROM ${entities} WHERE UPPER(name) = UPPER(?)`, [
    name,
  ]);
}

export async function insertRelatedEntity(
  kind: RelationshipKind,
  name: JsonValue,
): Promise<WriteResult> {
  const { entities } = relationship(kind);
  return runQuery(`INSERT INTO ${entities} (name) VALUES (?)`, [name]);
}

export async function insertRelationship(
  kind: RelationshipKind,
  choreographyId: ChoreographyId,
  entityId: number,
): Promise<WriteResult> {
  const { links, id } = relationship(kind);
  return runQuery(`INSERT INTO ${links} (choreography_id, ${id}) VALUES (?, ?)`, [
    choreographyId,
    entityId,
  ]);
}

export async function deleteRelationships(
  kind: RelationshipKind,
  choreographyId: ChoreographyId,
): Promise<WriteResult> {
  const { links } = relationship(kind);
  return runQuery(`DELETE FROM ${links} WHERE choreography_id = ?`, [choreographyId]);
}

export async function deleteInformation(choreographyId: ChoreographyId): Promise<WriteResult> {
  return runQuery('DELETE FROM choreography_information WHERE choreography_id = ?', [
    choreographyId,
  ]);
}

export async function ensureInformationCategory(name: string): Promise<WriteResult> {
  return runQuery(
    'INSERT OR IGNORE INTO choreography_info_categories (name, is_seeded) VALUES (?, 0)',
    [name],
  );
}

export async function findInformationCategory(name: string): Promise<{ id: number } | undefined> {
  return getQuery<{ id: number }>('SELECT id FROM choreography_info_categories WHERE name = ?', [
    name,
  ]);
}

export async function insertInformation(
  choreographyId: ChoreographyId,
  categoryId: number,
  description: string,
): Promise<WriteResult> {
  return runQuery(
    'INSERT INTO choreography_information (choreography_id, category_id, description) VALUES (?, ?, ?)',
    [choreographyId, categoryId, description],
  );
}

export async function deleteUnusedInformationCategories(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM choreography_info_categories
     WHERE is_seeded = 0 AND NOT EXISTS (
       SELECT 1 FROM choreography_information
       WHERE choreography_information.category_id = choreography_info_categories.id
     )`,
  );
}

export async function deleteUnusedAuthors(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM authors WHERE id NOT IN (
       SELECT DISTINCT author_id FROM choreography_authors WHERE author_id IS NOT NULL
     )`,
  );
}

export async function deleteUnusedTags(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM personal_data.tags WHERE id NOT IN (
       SELECT DISTINCT tag_id FROM personal_data.choreography_tags WHERE tag_id IS NOT NULL
     )`,
  );
}

export async function deleteOrphanedInformation(): Promise<WriteResult> {
  return runQuery(
    'DELETE FROM choreography_information WHERE choreography_id NOT IN (SELECT id FROM choreographies)',
  );
}

export async function deleteUnusedLevels(canonicalNames: string[]): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM levels WHERE id NOT IN (
       SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL
     ) AND UPPER(name) NOT IN (${canonicalNames.map(() => 'UPPER(?)').join(',')})`,
    canonicalNames,
  );
}

export async function deleteOrphanedRelationships(kind: RelationshipKind): Promise<WriteResult> {
  const { links } = relationship(kind);
  return runQuery(
    `DELETE FROM ${links} WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
}

export async function deleteOrphanedFigureComponents(): Promise<WriteResult> {
  return runQuery(
    `DELETE FROM step_figure_components
     WHERE parent_step_figure_id NOT IN (SELECT id FROM step_figures)
        OR child_step_figure_id NOT IN (SELECT id FROM step_figures)`,
  );
}
