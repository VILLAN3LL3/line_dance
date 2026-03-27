import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQuery, runQuery, allQuery } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function remigrateAuthors(csvFilename) {
  try {
    // Clear choreography_authors and authors tables
    console.log('Clearing choreography_authors and authors tables...');
    await runQuery('DELETE FROM choreography_authors');
    await runQuery('DELETE FROM authors');
    console.log('Tables cleared.');

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
        row[col] = (values[idx] || '').trim();
      });

      if (!row.Name) continue;

      // Find choreography records by name (may be duplicates from prior imports)
      const choreographies = await allQuery('SELECT id FROM choreographies WHERE name = ?', [row.Name]);
      if (!choreographies || choreographies.length === 0) {
        console.log(`⚠ Choreography not found: ${row.Name}`);
        continue;
      }

      const choreographyIds = choreographies.map(c => c.id);

      // Process choreographers
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

          for (const choreographyId of choreographyIds) {
            await runQuery('INSERT OR IGNORE INTO choreography_authors (choreography_id, author_id) VALUES (?, ?)', [choreographyId, authorId]);
          }
        }
      }

      console.log(`✓ Migrated authors for: ${row.Name}`);
    }

    console.log('Author migration completed successfully!');
  } catch (error) {
    console.error('Author migration failed:', error);
  }
}

const csvFile = process.argv[2] || 'Intermediate-Table 1.csv';
console.log(`Remigrating authors from CSV: ${csvFile}`);
remigrateAuthors(csvFile).catch(console.error);
