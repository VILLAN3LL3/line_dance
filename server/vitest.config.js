import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      CHOREOGRAPHY_DB_PATH: ':memory:',
      DANCE_GROUPS_DB_PATH: ':memory:',
      TAGS_DB_PATH: ':memory:',
      NODE_ENV: 'test',
    },
    // 'forks' isolates each test file in its own process, which is required
    // for native modules (sqlite3) and keeps in-memory databases separate.
    pool: 'forks',
  },
});
