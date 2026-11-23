# Operations Guide

## Local Production Server (PM2)

Run the app as a persistent local service that auto-starts on login and rebuilds after every commit.
Commands below assume the repository root as the starting directory.

### Setup

```bash
# 1. Build the server and client
cd server && npm run build && npm run build:pm2 && cd ..
cd client && npm run build && cd ..

# 2. Create local PM2 config
cp .env.pm2.example .env.pm2
# Edit .env.pm2 and set NODE_BINARY to: $(which node)

# 3. Start with PM2
pm2 start server/dist/pm2/ecosystem.config.cjs

# 4. Register as a login item (run once)
pm2 startup launchd   # copy and run the printed sudo command
pm2 save
```

App is available at **`http://localhost:3001`**.

If `line-dance` was registered before the backend build was introduced, its PM2 entry point
still points to TypeScript. After building, recreate that process and save the updated PM2
configuration:

```bash
pm2 delete line-dance
pm2 start server/dist/pm2/ecosystem.config.cjs
pm2 save
```

### Useful Commands

```bash
pm2 status
pm2 logs line-dance
pm2 restart line-dance
pm2 reload line-dance      # zero-downtime reload
```

### Auto-Deploy On Commit And Pull

The PM2 configuration is compiled from `ecosystem.config.cts` by `npm run build:pm2`.
It reads `.env.pm2` from the repository root and runs the compiled server from that root.
The `post-commit` hook rebuilds the server, PM2 configuration, and client and restarts PM2 after a commit.
The `post-merge` hook runs the same deployment once after a successful merge or fast-forward pull.
Squash merges are deployed after the resulting commit instead.
To avoid deploying intermediate commits during a pull, configure this repository to use merges:

```bash
git config --local pull.rebase false
```

An explicit rebase can still trigger deployment for each replayed commit.
The hooks resolve PM2 from `PATH` or an existing nvm installation; set `PM2_BINARY` to an absolute executable path to override this lookup.
Build or restart failures stop deployment without reporting success. An existing process with a
different entry point must be recreated as described above. The commit itself is already created
when this hook runs.

### Uninstall

```bash
pm2 stop line-dance && pm2 delete line-dance && pm2 save
pm2 unstartup launchd   # copy and run the printed sudo command
```

## Migrations

Choreography and dance-group schema changes are versioned under `server/migrations/`. The server runs migrations on startup; run them manually from the repository root with:

```bash
cd server && npm run build && npm run migrate
```

- Migration `013_add_session_choreography_repetitions` adds status and origin tracking. Existing assignments are classified by their first occurrence per course but are not retroactively linked or automatically expanded.
- Corrective migration `014_backfill_planned_session_repetitions` fills missing repetitions from legacy new-dance assignments in their next two course slots when those target dates are today or later in Europe/Berlin. Existing assignments and past session contents stay intact. Eligible legacy sources are enabled for subsequent automatic redistribution; already-managed sources are left unchanged so manually removed repetitions are not restored.
- Migration `015_remove_sessions_without_course` removes legacy sessions whose course no longer exists, along with their assignments.
- Choreography migration `016_create_choreography_songs` moves the `song` and `artist` columns of every choreography into the new `choreography_songs` table (one song each; an artist without a title becomes the title) and then drops both columns. This cannot be undone, so back up the choreography database before deploying. Dance-group migration `016_add_session_choreography_song` adds the nullable `session_choreographies.song_id`.
