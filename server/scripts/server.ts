import { createApp } from '../app.ts';
import { runMigrations } from '../migrations/index.js';
import { closeDatabase, getDatabase } from './db.ts';

const port: string | number = process.env.PORT || 3001;

getDatabase();
getDatabase('danceGroups');
await runMigrations();

const app = createApp();
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});
