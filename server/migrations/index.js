import { runDanceGroupsMigrations } from './dance-groups-migrations.js';

export async function runMigrations() {
  await runDanceGroupsMigrations();
}
