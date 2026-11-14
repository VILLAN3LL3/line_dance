import { runChoreographyMigrations } from './choreography-migrations.ts';
import { runDanceGroupsMigrations } from './dance-groups-migrations.ts';

export async function runMigrations(): Promise<void> {
  await runChoreographyMigrations();
  await runDanceGroupsMigrations();
}
