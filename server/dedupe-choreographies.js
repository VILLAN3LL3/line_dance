import { allQuery, runQuery } from './db.js';

async function dedupeChoreographies() {
  try {
    const duplicates = await allQuery(
      `SELECT name, GROUP_CONCAT(id) AS ids, COUNT(*) AS cnt
       FROM choreographies
       GROUP BY name
       HAVING cnt > 1`
    );

    for (const row of duplicates) {
      const name = row.name;
      const ids = row.ids.split(',').map(n => parseInt(n, 10)).sort((a, b) => a - b);
      const masterId = ids[0];
      const duplicateIds = ids.slice(1);

      console.log(`Deduping: ${name} -> keep ${masterId}, merge ${duplicateIds.join(', ')}`);

      // Redirect child joins to master id (avoid duplicates using INSERT OR IGNORE logic)
      for (const dupId of duplicateIds) {
        await runQuery(
          `INSERT OR IGNORE INTO choreography_authors (choreography_id, author_id)
           SELECT ?, author_id FROM choreography_authors WHERE choreography_id = ?`,
          [masterId, dupId]
        );

        await runQuery(
          `INSERT OR IGNORE INTO choreography_tags (choreography_id, tag_id)
           SELECT ?, tag_id FROM choreography_tags WHERE choreography_id = ?`,
          [masterId, dupId]
        );

        await runQuery(
          `INSERT OR IGNORE INTO choreography_step_figures (choreography_id, step_figure_id)
           SELECT ?, step_figure_id FROM choreography_step_figures WHERE choreography_id = ?`,
          [masterId, dupId]
        );

        // Delete the duplicate choreography record
        await runQuery('DELETE FROM choreographies WHERE id = ?', [dupId]);
      }
    }

    // Cleanup orphaned reference rows
    await runQuery(
      `DELETE FROM authors WHERE id NOT IN (SELECT DISTINCT author_id FROM choreography_authors WHERE author_id IS NOT NULL)`
    );
    await runQuery(
      `DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM choreography_tags WHERE tag_id IS NOT NULL)`
    );
    await runQuery(
      `DELETE FROM step_figures WHERE id NOT IN (SELECT DISTINCT step_figure_id FROM choreography_step_figures WHERE step_figure_id IS NOT NULL)`
    );
    await runQuery(
      `DELETE FROM levels WHERE id NOT IN (SELECT DISTINCT level_id FROM choreographies WHERE level_id IS NOT NULL)`
    );

    console.log('Deduplication complete');
  } catch (error) {
    console.error('Error during deduplication:', error);
  }
}

dedupeChoreographies().catch(console.error);
