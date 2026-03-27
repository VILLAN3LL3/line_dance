import { runQuery, allQuery, getQuery } from './db.js';

async function migrateIsPhrasedToTag() {
  try {
    console.log('Starting migration: isPhrased flag to phrased tag');

    // First, ensure the "phrased" tag exists
    let tagResult = await getQuery('SELECT id FROM tags WHERE name = ?', ['phrased']);
    let tagId;

    if (!tagResult) {
      console.log('Creating "phrased" tag...');
      const insertResult = await runQuery('INSERT INTO tags (name) VALUES (?)', ['phrased']);
      tagId = insertResult.id;
      console.log(`Created tag with ID: ${tagId}`);
    } else {
      tagId = tagResult.id;
      console.log(`Using existing tag with ID: ${tagId}`);
    }

    // Get all choreographies where isPhrased = 1
    const phrasedChoreos = await allQuery(
      'SELECT id, name FROM choreographies WHERE isPhrased = 1'
    );

    console.log(`Found ${phrasedChoreos.length} choreographies with isPhrased = 1`);

    // Add the phrased tag to each choreography (INSERT OR IGNORE to avoid duplicates)
    for (const choreo of phrasedChoreos) {
      await runQuery(
        'INSERT OR IGNORE INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)',
        [choreo.id, tagId]
      );
      console.log(`Added phrased tag to choreography: ${choreo.name}`);
    }

    // Drop the isPhrased column
    console.log('Dropping isPhrased column...');
    await runQuery('ALTER TABLE choreographies DROP COLUMN isPhrased');
    console.log('Successfully dropped isPhrased column');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

migrateIsPhrasedToTag().catch(console.error);