import { getQuery, runQuery, withTransaction } from '../../scripts/db.ts';

const relationships = {
  authors: { entities: 'authors', links: 'choreography_authors', id: 'author_id' },
  figures: { entities: 'step_figures', links: 'choreography_step_figures', id: 'step_figure_id' },
  tags: { entities: 'personal_data.tags', links: 'personal_data.choreography_tags', id: 'tag_id' },
};

function relationship(kind) {
  const result = relationships[kind];
  if (!result) throw new Error(`Unknown choreography relationship: ${kind}`);
  return result;
}

export function withChoreographyTransaction(action) {
  return withTransaction('choreography', action);
}

export function findLevel(name) {
  return getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [name]);
}

export function findChoreography(id) {
  return getQuery('SELECT id FROM choreographies WHERE id = ?', [id]);
}

export function insertChoreography(input, levelId) {
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

export function updateChoreography(id, input, levelId) {
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

export function deleteChoreography(id) {
  return runQuery('DELETE FROM choreographies WHERE id = ?', [id]);
}

export function findRelatedEntity(kind, name) {
  const { entities } = relationship(kind);
  return getQuery(`SELECT id FROM ${entities} WHERE UPPER(name) = UPPER(?)`, [name]);
}

export function insertRelatedEntity(kind, name) {
  const { entities } = relationship(kind);
  return runQuery(`INSERT INTO ${entities} (name) VALUES (?)`, [name]);
}

export function insertRelationship(kind, choreographyId, entityId) {
  const { links, id } = relationship(kind);
  return runQuery(`INSERT INTO ${links} (choreography_id, ${id}) VALUES (?, ?)`, [
    choreographyId,
    entityId,
  ]);
}

export function deleteRelationships(kind, choreographyId) {
  const { links } = relationship(kind);
  return runQuery(`DELETE FROM ${links} WHERE choreography_id = ?`, [choreographyId]);
}

export function deleteInformation(choreographyId) {
  return runQuery('DELETE FROM choreography_information WHERE choreography_id = ?', [
    choreographyId,
  ]);
}

export function ensureInformationCategory(name) {
  return runQuery(
    'INSERT OR IGNORE INTO choreography_info_categories (name, is_seeded) VALUES (?, 0)',
    [name],
  );
}

export function findInformationCategory(name) {
  return getQuery('SELECT id FROM choreography_info_categories WHERE name = ?', [name]);
}

export function insertInformation(choreographyId, categoryId, description) {
  return runQuery(
    'INSERT INTO choreography_information (choreography_id, category_id, description) VALUES (?, ?, ?)',
    [choreographyId, categoryId, description],
  );
}

export function deleteUnusedInformationCategories() {
  return runQuery(
    `DELETE FROM choreography_info_categories
     WHERE is_seeded = 0 AND NOT EXISTS (
       SELECT 1 FROM choreography_information
       WHERE choreography_information.category_id = choreography_info_categories.id
     )`,
  );
}

export function deleteUnusedAuthors() {
  return runQuery(
    `DELETE FROM authors WHERE id NOT IN (
       SELECT DISTINCT author_id FROM choreography_authors WHERE author_id IS NOT NULL
     )`,
  );
}

export function deleteUnusedTags() {
  return runQuery(
    `DELETE FROM personal_data.tags WHERE id NOT IN (
       SELECT DISTINCT tag_id FROM personal_data.choreography_tags WHERE tag_id IS NOT NULL
     )`,
  );
}

export function deleteOrphanedInformation() {
  return runQuery(
    'DELETE FROM choreography_information WHERE choreography_id NOT IN (SELECT id FROM choreographies)',
  );
}

export function deleteUnusedLevels(canonicalNames) {
  return runQuery(
    `DELETE FROM levels WHERE id NOT IN (
       SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL
     ) AND UPPER(name) NOT IN (${canonicalNames.map(() => 'UPPER(?)').join(',')})`,
    canonicalNames,
  );
}

export function deleteOrphanedRelationships(kind) {
  const { links } = relationship(kind);
  return runQuery(
    `DELETE FROM ${links} WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
}

export function deleteOrphanedFigureComponents() {
  return runQuery(
    `DELETE FROM step_figure_components
     WHERE parent_step_figure_id NOT IN (SELECT id FROM step_figures)
        OR child_step_figure_id NOT IN (SELECT id FROM step_figures)`,
  );
}
