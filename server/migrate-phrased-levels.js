import { getDatabase, runQuery, allQuery, getQuery } from './db.js';

async function migratePhrasedLevelsToTags() {
  console.log('Starting migration: phrased levels to tags');

  const db = getDatabase();

  // Mapping of phrased level IDs to non-phrased level IDs
  const levelMapping = {
    8: 7,   // High Beginner Phrased -> High Beginner
    13: 12, // High Improver Phrased -> High Improver
    14: 9,  // Improver Phrased -> Improver
    15: 2,  // Advanced Phrased -> Advanced
    17: 3   // Intermediate Phrased -> Intermediate
  };

  const phrasedLevelIds = Object.keys(levelMapping).map(id => parseInt(id));

  try {
    // Get or create the "phrased" tag
    let phrasedTagId;
    const existingTag = await getQuery('SELECT id FROM tags WHERE name = ?', ['phrased']);
    if (existingTag) {
      phrasedTagId = existingTag.id;
      console.log('Found existing "phrased" tag with ID:', phrasedTagId);
    } else {
      const result = await runQuery('INSERT INTO tags (name) VALUES (?)', ['phrased']);
      phrasedTagId = result.id;
      console.log('Created new "phrased" tag with ID:', phrasedTagId);
    }

    // Get all choreographies using phrased levels
    const phrasedChoreos = await allQuery(
      'SELECT id, name, level_id FROM choreographies WHERE level_id IN (' + phrasedLevelIds.join(',') + ')'
    );

    console.log(`Found ${phrasedChoreos.length} choreographies using phrased levels`);

    // Process each choreography
    for (const choreo of phrasedChoreos) {
      console.log(`Processing: ${choreo.name} (ID: ${choreo.id})`);

      // Add "phrased" tag to choreography (if not already present)
      const existingTagRelation = await getQuery(
        'SELECT * FROM choreography_tags WHERE choreography_id = ? AND tag_id = ?',
        [choreo.id, phrasedTagId]
      );

      if (!existingTagRelation) {
        await runQuery(
          'INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)',
          [choreo.id, phrasedTagId]
        );
        console.log(`  Added "phrased" tag to ${choreo.name}`);
      } else {
        console.log(`  ${choreo.name} already has "phrased" tag`);
      }

      // Update choreography to use non-phrased level
      const newLevelId = levelMapping[choreo.level_id];
      await runQuery(
        'UPDATE choreographies SET level_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newLevelId, choreo.id]
      );
      console.log(`  Updated ${choreo.name} level from ${choreo.level_id} to ${newLevelId}`);
    }

    // Remove phrased levels
    console.log('Removing phrased levels...');
    for (const levelId of phrasedLevelIds) {
      await runQuery('DELETE FROM levels WHERE id = ?', [levelId]);
      console.log(`  Removed level ID: ${levelId}`);
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migratePhrasedLevelsToTags().catch(console.error);