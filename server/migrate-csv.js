import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQuery, runQuery } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateCSV(csvFilename) {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'raw_data', csvFilename);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    // Parse and normalize header
    const header = lines[0].split(';').map(col => col.trim().replace('\r', ''));

    console.log('CSV Headers:', header);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';');
      if (values.length < header.length) continue;

      const row = {};
      header.forEach((col, idx) => {
        // normalize col name and values
        row[col] = (values[idx] || '').trim();
      });

      if (!row.Name) continue;

      console.log(`Processing: ${row.Name}`);

      // Level
      let levelName = row.Level && row.Level !== '?' ? row.Level : 'Absolute Beginner';
      let levelId = null;
      if (levelName) {
        const levelResult = await getQuery('SELECT id FROM levels WHERE name = ?', [levelName]);
        if (!levelResult) {
          const res = await runQuery('INSERT INTO levels (name) VALUES (?)', [levelName]);
          levelId = res.id;
        } else {
          levelId = levelResult.id;
        }
      }

      // Insert choreography
      const creationYear = row.Jahr && row.Jahr !== '?' ? parseInt(row.Jahr, 10) : null;
      const count = row.Count ? parseInt(row.Count, 10) : null;
      const wallCount = row.Wall ? parseInt(row.Wall, 10) : null;

      const choreoRes = await runQuery(
        `INSERT INTO choreographies (name, level_id, count, wall_count, creation_year, demo_video_url, tutorial_video_url, step_sheet_link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.Name, levelId, count, wallCount, creationYear, row.Demo || null, row.Tutorial || null, row.Stepsheets || null]
      );

      const choreographyId = choreoRes.id;
      const tags = [];

      if (row['Kann ich'] && row['Kann ich'].toLowerCase() === 'x') {
        tags.push('Gelernt');
      }

      if (row.Stil) {
        tags.push(row.Stil);
      }

      for (const tagName of Array.from(new Set(tags)).filter(Boolean)) {
        let tagId = null;
        const tagResult = await getQuery('SELECT id FROM tags WHERE name = ?', [tagName]);
        if (!tagResult) {
          const res = await runQuery('INSERT INTO tags (name) VALUES (?)', [tagName]);
          tagId = res.id;
        } else {
          tagId = tagResult.id;
        }

        await runQuery('INSERT INTO choreography_tags (choreography_id, tag_id) VALUES (?, ?)', [choreographyId, tagId]);
      }

      // Add choreographers into choreography_authors (if present in CSV)
      const choreographerText = row.Choreographer || row.Choreographers || '';
      if (choreographerText.trim()) {
        // Extract all "Name (CountryCode)" pairs using regex
        const choreographerRegex = /([A-Za-z\s.'-]+?)\s*\(([A-Z]{2,3}(?:\.[A-Z]{2,3})?)\)/g;
        const choreographers = [];
        let match;

        while ((match = choreographerRegex.exec(choreographerText)) !== null) {
          const name = match[1].trim();
          const countryCode = match[2];
          choreographers.push(`${name} (${countryCode})`);
        }

        // If no regex matches found, fall back to the old parsing logic
        if (choreographers.length === 0) {
          const rawChoreographers = choreographerText
            .replace(/\band\b/gi, ',')
            .replace(/&/g, ',')
            .replace(/;/g, ',')
            .replace(/\//g, ',')
            .split(',')
            .map(name => name.trim())
            .filter(Boolean);

          for (let j = 0; j < rawChoreographers.length; j++) {
            const name = rawChoreographers[j];
            if (!/^\(?[A-Za-z]{2,3}\)?$/.test(name)) {
              choreographers.push(name);
            }
          }
        }

        for (const choreographer of Array.from(new Set(choreographers)).filter(Boolean)) {
          let authorId = null;
          const authorResult = await getQuery('SELECT id FROM authors WHERE name = ?', [choreographer]);
          if (!authorResult) {
            const res = await runQuery('INSERT INTO authors (name) VALUES (?)', [choreographer]);
            authorId = res.id;
          } else {
            authorId = authorResult.id;
          }

          await runQuery('INSERT INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)', [choreographyId, authorId]);
        }
      }

      const stepsheetsIndex = header.indexOf('Stepsheets');
      if (stepsheetsIndex >= 0) {
        for (let j = stepsheetsIndex + 1; j < header.length; j++) {
          const figureName = header[j];
          const figureValue = values[j] ? values[j].trim() : '';

          if (figureValue.toLowerCase() === 'x') {
            let figureId = null;
            const figureResult = await getQuery('SELECT id FROM step_figures WHERE name = ?', [figureName]);
            if (!figureResult) {
              const res = await runQuery('INSERT INTO step_figures (name) VALUES (?)', [figureName]);
              figureId = res.id;
            } else {
              figureId = figureResult.id;
            }

            await runQuery('INSERT INTO choreography_step_figures (choreography_id, step_figure_id) VALUES (?, ?)', [choreographyId, figureId]);
          }
        }
      }

      console.log(`✓ Migrated: ${row.Name}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

const csvFile = process.argv[2] || 'Beginner-Table 1.csv';
console.log(`Migrating from CSV: ${csvFile}`);
migrateCSV(csvFile).catch(console.error);