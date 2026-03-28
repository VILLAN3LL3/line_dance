import { runMigrations } from './index.js';

try {
  await runMigrations();
  console.log('All migrations applied successfully.');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
