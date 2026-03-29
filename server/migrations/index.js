import { runChoreographyMigrations } from './choreography-migrations.js';
import { runDanceGroupsMigrations } from './dance-groups-migrations.js';

export async function runMigrations() {
  await runChoreographyMigrations();
  await runDanceGroupsMigrations();
}
