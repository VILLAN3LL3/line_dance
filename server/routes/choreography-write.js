import { runQuery, getQuery, withTransaction } from '../scripts/db.js';

export async function createChoreographyRecord(input) {
  const {
    name,
    step_sheet_link,
    demo_video_url,
    tutorial_video_url,
    count,
    wall_count,
    level,
    creation_year,
    choreography_information: rawChoreographyInformation,
    song,
    artist,
    authors,
    tags,
    step_figures,
  } = input;
  const choreographyInformation = normalizeChoreographyInformation(rawChoreographyInformation);

  return withTransaction('choreography', async () => {
    const levelRecord = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [
      level,
    ]);
    if (!levelRecord) return null;

    const choreoResult = await runQuery(
      `INSERT INTO choreographies (name, step_sheet_link, demo_video_url, tutorial_video_url, count, wall_count, level_id, creation_year, song, artist)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        step_sheet_link || null,
        demo_video_url || null,
        tutorial_video_url || null,
        count || null,
        wall_count || null,
        levelRecord.id,
        creation_year || null,
        song || null,
        artist || null,
      ],
    );

    const choreography_id = choreoResult.id;

    await insertRelationship(
      choreography_id,
      authors,
      getAuthorId,
      'choreography_authors',
      'author_id',
      'authors',
    );
    await insertRelationship(
      choreography_id,
      step_figures,
      getStepFigureId,
      'choreography_step_figures',
      'step_figure_id',
      'step_figures',
    );
    await insertRelationship(
      choreography_id,
      tags,
      getTagId,
      'personal_data.choreography_tags',
      'tag_id',
      'personal_data.tags',
    );
    await replaceChoreographyInformation(choreography_id, choreographyInformation || []);
    return choreography_id;
  });
}

export async function updateChoreographyRecord(choreography_id, input) {
  const {
    name,
    step_sheet_link,
    demo_video_url,
    tutorial_video_url,
    count,
    wall_count,
    level,
    creation_year,
    choreography_information: rawChoreographyInformation,
    song,
    artist,
    authors,
    tags,
    step_figures,
  } = input;
  const choreographyInformation = normalizeChoreographyInformation(rawChoreographyInformation);

  return withTransaction('choreography', async () => {
    const current = await getQuery('SELECT id FROM choreographies WHERE id = ?', [choreography_id]);
    if (!current) return 'not_found';

    let levelId = null;
    if (level) {
      const levelRecord = await getQuery('SELECT id FROM levels WHERE UPPER(name) = UPPER(?)', [
        level,
      ]);
      if (!levelRecord) {
        return 'invalid_level';
      }
      levelId = levelRecord.id;
    }

    const updateFields = [
      name,
      step_sheet_link || null,
      demo_video_url || null,
      tutorial_video_url || null,
      count || null,
      wall_count || null,
      creation_year || null,
      song || null,
      artist || null,
    ];
    const updateQuery = levelId
      ? `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, level_id = ?, creation_year = ?, song = ?, artist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      : `UPDATE choreographies SET name = ?, step_sheet_link = ?, demo_video_url = ?, tutorial_video_url = ?, count = ?, wall_count = ?, creation_year = ?, song = ?, artist = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    const updateParams = levelId
      ? [...updateFields.slice(0, 6), levelId, ...updateFields.slice(6), choreography_id]
      : [...updateFields, choreography_id];
    await runQuery(updateQuery, updateParams);

    await deleteAndReinsertRelationships(
      choreography_id,
      authors,
      'choreography_authors',
      'author_id',
      'authors',
      getAuthorId,
    );
    await deleteAndReinsertRelationships(
      choreography_id,
      step_figures,
      'choreography_step_figures',
      'step_figure_id',
      'step_figures',
      getStepFigureId,
    );
    await deleteAndReinsertRelationships(
      choreography_id,
      tags,
      'personal_data.choreography_tags',
      'tag_id',
      'personal_data.tags',
      getTagId,
    );

    if (choreographyInformation !== undefined) {
      await replaceChoreographyInformation(choreography_id, choreographyInformation);
    }

    await cleanupOrphanedRecords();
    return 'ok';
  });
}

export async function deleteChoreographyRecord(choreography_id) {
  return withTransaction('choreography', async () => {
    // Remove join table entries first
    await runQuery('DELETE FROM choreography_information WHERE choreography_id = ?', [
      choreography_id,
    ]);
    await runQuery('DELETE FROM choreography_authors WHERE choreography_id = ?', [choreography_id]);
    await runQuery('DELETE FROM personal_data.choreography_tags WHERE choreography_id = ?', [
      choreography_id,
    ]);
    await runQuery('DELETE FROM choreography_step_figures WHERE choreography_id = ?', [
      choreography_id,
    ]);

    const deleted = await runQuery('DELETE FROM choreographies WHERE id = ?', [choreography_id]);

    if (deleted.changes === 0) return false;

    // Clean up orphaned records
    await cleanupOrphanedRecords();
    return true;
  });
}

// Helper function to clean up orphaned records
async function cleanupOrphanedRecords() {
  // Delete orphaned authors (not used by any choreography)
  await runQuery(
    `DELETE FROM authors
       WHERE id NOT IN (
         SELECT DISTINCT author_id FROM choreography_authors WHERE author_id IS NOT NULL
       )`,
  );

  // Delete orphaned tags (not used by any choreography)
  await runQuery(
    `DELETE FROM personal_data.tags
       WHERE id NOT IN (
         SELECT DISTINCT tag_id FROM personal_data.choreography_tags WHERE tag_id IS NOT NULL
       )`,
  );

  await runQuery(
    `DELETE FROM choreography_information
       WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );

  await cleanupUnusedChoreographyInfoCategories();

  // Delete orphaned non-canonical levels (not used by any choreography)
  const canonicalLevelNames = [
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
  const canonicalPlaceholders = canonicalLevelNames.map(() => 'UPPER(?)').join(',');
  await runQuery(
    `DELETE FROM levels
       WHERE id NOT IN (
         SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL
       )
       AND UPPER(name) NOT IN (${canonicalPlaceholders})`,
    canonicalLevelNames,
  );

  // Also clean up any dangling join table entries for non-existent choreographies
  await runQuery(
    `DELETE FROM choreography_authors WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
  await runQuery(
    `DELETE FROM personal_data.choreography_tags WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
  await runQuery(
    `DELETE FROM choreography_step_figures WHERE choreography_id NOT IN (SELECT id FROM choreographies)`,
  );
  await runQuery(
    `DELETE FROM step_figure_components
       WHERE parent_step_figure_id NOT IN (SELECT id FROM step_figures)
          OR child_step_figure_id NOT IN (SELECT id FROM step_figures)`,
  );
}

function normalizeChoreographyInformation(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const normalized = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    if (typeof item.category !== 'string' || typeof item.description !== 'string') return null;

    const category = item.category.trim();
    const description = item.description.trim();
    if (category && description) normalized.push({ category, description });
  }

  return normalized;
}

async function replaceChoreographyInformation(choreographyId, information) {
  await runQuery('DELETE FROM choreography_information WHERE choreography_id = ?', [
    choreographyId,
  ]);

  await information.reduce(
    (previous, item) =>
      previous.then(async () => {
        await runQuery(
          `INSERT OR IGNORE INTO choreography_info_categories (name, is_seeded) VALUES (?, 0)`,
          [item.category],
        );
        const category = await getQuery(
          `SELECT id FROM choreography_info_categories WHERE name = ?`,
          [item.category],
        );
        await runQuery(
          `INSERT INTO choreography_information (choreography_id, category_id, description)
           VALUES (?, ?, ?)`,
          [choreographyId, category.id, item.description],
        );
      }),
    Promise.resolve(),
  );

  await cleanupUnusedChoreographyInfoCategories();
}

async function cleanupUnusedChoreographyInfoCategories() {
  await runQuery(
    `DELETE FROM choreography_info_categories
     WHERE is_seeded = 0
       AND NOT EXISTS (
         SELECT 1 FROM choreography_information
         WHERE choreography_information.category_id = choreography_info_categories.id
       )`,
  );
}

async function insertRelationship(
  choreography_id,
  items,
  getItemId,
  relationshipTable,
  relationshipIdCol,
  creationTable,
) {
  if (!items || !Array.isArray(items)) return;
  await items.reduce(
    (pendingInserts, item) =>
      pendingInserts.then(async () => {
        let itemId = await getItemId(item);
        if (!itemId) {
          const result = await runQuery(`INSERT INTO ${creationTable} (name) VALUES (?)`, [item]);
          itemId = result.id;
        }
        await runQuery(
          `INSERT INTO ${relationshipTable} (choreography_id, ${relationshipIdCol}) VALUES (?, ?)`,
          [choreography_id, itemId],
        );
      }),
    Promise.resolve(),
  );
}

async function deleteAndReinsertRelationships(
  choreography_id,
  items,
  relationshipTable,
  relationshipIdCol,
  creationTable,
  getIdFn,
) {
  if (items === undefined) return;
  await runQuery(`DELETE FROM ${relationshipTable} WHERE choreography_id = ?`, [choreography_id]);
  if (Array.isArray(items) && items.length > 0) {
    await insertRelationship(
      choreography_id,
      items,
      getIdFn,
      relationshipTable,
      relationshipIdCol,
      creationTable,
    );
  }
}

async function getAuthorId(name) {
  const result = await getQuery('SELECT id FROM authors WHERE UPPER(name) = UPPER(?)', [name]);
  return result ? result.id : null;
}

async function getStepFigureId(name) {
  const result = await getQuery('SELECT id FROM step_figures WHERE UPPER(name) = UPPER(?)', [name]);
  return result ? result.id : null;
}

async function getTagId(name) {
  const result = await getQuery('SELECT id FROM personal_data.tags WHERE UPPER(name) = UPPER(?)', [
    name,
  ]);
  return result ? result.id : null;
}
