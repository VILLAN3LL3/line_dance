import { runChoreographyMigrations } from './choreography-migrations.js';
import { runDanceGroupsMigrations } from './dance-groups-migrations.ts';

export async function runMigrations() {
  await runChoreographyMigrations();
  await runDanceGroupsMigrations();
}
