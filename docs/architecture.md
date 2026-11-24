# Architecture Overview

## Backend

The Express application is assembled in `server/app.ts`; `server/scripts/server.ts` initializes the
databases and migrations, starts the listener, and handles shutdown. Production and API tests use the
same app and route registrations. Choreography and dance-group HTTP routes are registered in their
respective router modules under `server/routes/`.

Backend features live under `server/features/`. Pure operations normalize, validate, and transform
data without database or HTTP dependencies; flows coordinate operations, persistence, external
services, and transactions; repositories own SQLite queries; and route handlers translate flow
results into HTTP responses. The URL checker uses an HTTP gateway, and the PDF renderers (course and participant PDF, sharing header, colors, trainer box and privacy notice in `routes/course-pdf-shared.ts` and `routes/course-pdf-trainer.ts`) write the
prepared document to the response. Search SQL is assembled on the repository side, while
step-figure hierarchy expansion is a pure operation.

Unit tests cover operations; integration tests exercise flows with SQLite or the HTTP gateway;
API tests verify HTTP contracts. ESLint enforces import restrictions and prevents direct network
requests in route handlers and pure operations.

For backend changes, follow the [backend architecture skill](../.github/skills/backend-architecture/SKILL.md)
for responsibility boundaries, transaction handling, and testing.

The backend and its tests are written in TypeScript. `npm run typecheck`
checks them in strict mode.
`npm run build` emits production JavaScript to `server/dist/` and rewrites relative TypeScript
imports. Production start and migration commands use this build; the development watcher runs
TypeScript directly. Database paths and PDF assets remain relative to `server/`, not `server/dist/`.
Shared client/server API types live in `server/contracts/api.ts` and are re-exported by the
client. Client preview Docker builds use the repository root as their build context.
Choreography `count`, `wall_count`, and `creation_year` accept only safe integers or empty
values. Invalid values already stored in the database cause affected read requests to fail rather
than being silently discarded; correct those records before relying on catalog reads.
Optional absent choreography fields and course links are omitted from API responses; a session
without a semester has `semester: null`. Choreography create and update responses contain a
numeric `id`.
Endpoints validate untrusted input with Zod and pure operations invoked by shared HTTP
middleware, configured per endpoint with its input source and validator. Flows receive typed
validation results, with branded types where appropriate. Existing error responses and their precedence are preserved;
rating conversion remains backward-compatible with the existing API.

The database helper `withTransaction()` serializes transactions and queries per SQLite connection.
Choreography writes (including cleanup), group/base-figure changes, trainer writes, course creation
and updates, rating updates, level creation, saved-filter and step-figure writes, session creation,
updates and rearrangement, assignment creation, and migrations use transaction boundaries to
prevent partial writes or lost updates. A failure during choreography cleanup rolls back the
operation and returns an error. The `personal_data` database is attached to the choreography connection; the separate
dance-groups and choreography connections do not share an atomic transaction. Cross-database reads
are therefore not a single consistent snapshot.

### Effective choreography level

Besides the official level, a choreography can have a personal level, stored in
`personal_data.choreography_personal_levels` (no cross-database foreign key; the choreography write
cleanup removes orphans and keeps levels that a personal level still references). API responses
return `level` (effective: personal level when set, otherwise the official one), `official_level`
and `personal_level`. The SQL fragments for the effective level live in
`server/features/choreographies/level-sql.ts` and are shared by search, step figure suggestions and
author statistics. Editing a choreography always works on `official_level`. `POST` and
`PUT /api/choreographies` accept `personal_level` and write it in the same transaction as the
choreography: omitted keeps it, `null` or an empty string removes it, an unknown level is reported
as the field issue `{ field: "personal_level", key: "invalid_level" }`.

### Songs per choreography

A choreography has any number of songs in `choreography_songs` (catalog database: title, artist,
optional `youtube_url`, `spotify_url` and `note`, ordered by `position`). The favorite song is a
personal choice and lives in `personal_data.choreography_favorite_songs`; without a favorite the
first song is the default. Neither the favorite nor `session_choreographies.song_id` (dance-groups
database, `NULL` = default song) has a cross-database foreign key: the choreography write cleanup
removes orphaned favorites, and a session reference to a deleted song is treated as the default by
the client.

API responses return `choreography_songs` (`id`, `title`, optional `artist`, `youtube_url`,
`spotify_url`, `note`, `is_favorite`). `POST` and `PUT /api/choreographies` accept
`choreography_songs` and write it in the same transaction as the choreography: omitted keeps the
songs, an array replaces them. Rows with an existing `id` are updated and keep that id (session
assignments reference it), other rows are inserted, blank rows are ignored, and at most one row
may set `is_favorite`. Issues are reported as `{ field: "choreography_songs.N.title", key: "required" }`,
`…youtube_url` / `…spotify_url` with `invalid_url` (only `http(s)` links), and
`{ field: "choreography_songs", key: "invalid_songs" }`. The `song_artist` search filter matches the
title or artist of any song. `PATCH /api/session-choreographies/:id` with `{ "song_id": <id> | null }`
sets the song of a session assignment (and its automatic repetitions); the song must belong to the
assigned choreography. The legacy `choreographies.song` and `artist` columns were migrated into
`choreography_songs` (migration `016_create_choreography_songs`) and dropped, so back up the database
before deploying. Song rules live in `server/features/choreographies/song-operations.ts`
(pure), `song-repository.ts` (SQL) and `song-flow.ts` (orchestration).

#### Music metadata per song

Each song may have `bpm` (whole number, 30–300), `length_seconds` (whole number, 1–3600) and a `genre`.
They belong to the song rather than the choreography because a choreography can have several songs.
Genres live in the catalog table `genres` (name unique ignoring case) and are referenced by
`choreography_songs.genre_id`. They are created by name while the songs are written (in the same
transaction), the stored spelling of the first use wins, and the write cleanup removes genres that no
song uses any more. `GET /api/genres` returns the names. Writing `bpm` or `length_seconds` accepts only
whole numbers or blank (`null`, `""`, omitted); anything else is reported as
`{ field: "choreography_songs.N.bpm" | "choreography_songs.N.length_seconds", key: "invalid_integer" }`.
Responses return `bpm`, `length_seconds` and `genre` when set.

`GET /api/choreographies/search` accepts `min_bpm`, `max_bpm`, `max_length_seconds` and `genres` (any
of the names, ignoring case). All of them must hold for the same song of a choreography; songs without
a BPM or length never satisfy a bound on it. They are combined with the other filters (including
`song_artist`, which is evaluated independently) and stored in saved filter configurations. Sorting
by BPM, genre and length is done on the client in the table view, based on the default song.

On the client, `model/song-music.ts` converts between the `m:ss` form text and seconds and builds the
summary line (`120 BPM · Country · 3:45`) shown on cards, in the detail view and in the clipboard text.
Text that does not parse is submitted unchanged, so the backend reports the issue and the range rules
exist only there.

On the client, the pure functions in `features/choreographies/model/choreography-songs.ts` and
`song-search.ts` handle the form rows, the default and session song and the link resolution: a stored
link wins, otherwise the YouTube/Spotify button searches for "artist title" (this needs both).

## Frontend

The client is organized by feature (`client/src/features/<feature>/`) following MVVM, mirroring the
backend layering: **views** (React components) render props and emit events; **view models**
(`use…ViewModel` hooks returning `{ state, actions }`) own UI state and orchestrate API calls with
TanStack Query; pure **model** functions hold the rules (filter handling, sorting, form mapping,
issue-key texts); `api.ts` per feature is the only gateway to the server. Shared building blocks
live in `client/src/shared/` (HTTP client, storage and browser gateways, query defaults, UI
components); `client/src/app/` holds the router and shell. Features: choreographies, choreographers,
courses (incl. sessions), dance-groups, metadata, saved-filters, step-figures, trainers, url-check.

ESLint enforces the dependency direction (views must not call gateways, models stay pure, `shared`
does not import features). Validation rules stay on the server; the client only maps the returned
issue keys to display text. See the
[frontend architecture skill](../.github/skills/frontend-architecture/SKILL.md) for the rules and
`client/src/features/trainers/` for the reference implementation.

### Personal learning status

Each choreography can be on the personal **wishlist** (`wishlist`) or marked **learned** (`learned`);
without an entry it is on neither list. The status lives in
`personal_data.choreography_learning_status` (`choreography_id`, `status`, `status_date`; no
cross-database foreign key, so the choreography write cleanup removes orphans). `status_date` is the
day (`YYYY-MM-DD`, local time) the current status was set: it changes together with the status and
stays when the same status is saved again. Entries migrated from hashtags have no date.

Migration `018_add_choreography_learning_status` replaces the former hashtags: dances tagged
`Gelernt` become `learned`, dances tagged `will lernen` (any capitalization) become `wishlist`
(`learned` wins when both exist). The tags are then removed from the dances and deleted, so back up
the database before deploying. Saved filters that reference these tags are not migrated.

API responses return `learning_status` and `learning_status_date` (both `null` without a status).
`PUT /api/choreographies/:id/learning-status` with `{ "status": "wishlist" | "learned" }` sets it and
returns `{ choreography_id, status, status_date }`; `DELETE` removes it (`400` for an invalid id or
status, `404` for an unknown choreography on `PUT`). `POST` and `PUT /api/choreographies` also accept
`learning_status` and write it in the same transaction: omitted keeps it, `null` or an empty string
removes it, any other value is reported as `{ field: "learning_status", key: "invalid_learning_status" }`.
`GET /api/choreographies/search` accepts `learning_status` (one or several statuses, ignoring case).
Code: `server/features/learning-status/` (`operations.ts` pure, `validation.ts`, `repository.ts`,
`flow.ts`), the SQL join fragment in `server/features/choreographies/learning-status-sql.ts`.

On the client, the card title starts with 🤍 (wishlist) or ✅ (learned), with the date in its
tooltip and under the level badge. Clicking the icon unfolds a small editor like the rating pill with
the three choices 🤍, ✅ and 🔳 (no status) plus a ✕ button to close it; a dance without status opens the same editor by clicking
its title. Picking an option saves it and closes the editor; ✕ and Escape close it without a change. The
choreography form has a "Learning Status" field. The "Personal" page (`client/src/features/personal/`, route `/personal`)
lists both lists as tabs; it is the home of the personal dance development features, separate from
the catalog and from course planning.

### Practice log and flash cards

Practicing is logged in `personal_data.choreography_practice_log` (migration
`019_add_choreography_practice_log`): `id`, `choreography_id`, `practiced_on` (`YYYY-MM-DD`, any day
up to today, so practice can be entered afterwards), `confidence` (`sure` or `unsure`), optional
`song_id` and `note`. There is no cross-database foreign key; the choreography write cleanup removes
orphans. Practicing in a course session does not count automatically.

- `POST /api/practice-log` takes `{ choreography_ids[], practiced_on?, confidence?, song_id?, note? }`
  (1–100 dances, all or nothing in one transaction; `song_id` only with exactly one dance, and it must
  be one of its songs) and returns `201 { logged, practiced_on }`. `400` for invalid input or a future
  date, `404` if a dance does not exist. `GET /api/practice-log?limit=` lists the entries newest first
  (default 100, maximum 500), `DELETE /api/practice-log/:id` removes one.
- `GET /api/practice/suggestions` returns every **learned** dance with `last_practiced_on`,
  `last_note`, `practice_count`, `next_due_on`, `is_due` and `days_overdue`, the most urgent first.
  The client combines it with the learned choreographies, so no second choreography serialization
  exists.

Spaced repetition (`server/features/practice/operations.ts`, pure): the interval until the next review
grows with the number of consecutive `sure` practices; an `unsure` practice starts again at the first
step. The higher the effective level (personal level when set, see above), the more often a dance has
to be repeated, so the early steps are shorter. All levels end at the same step of 182 days, which
repeats for good: a learned dance stays in the box and comes back at least every half year.

| Level (value) | Days after 1, 2, 3 … consecutive `sure` practices |
|---|---|
| Beginner (up to 40, also unknown) | 1, 2, 4, 7, 10, 14, 21, 30, 45, 60, 90, 120, 150, then 182 |
| Improver (up to 80) | 1, 2, 3, 5, 8, 12, 18, 26, 38, 55, 80, 115, 150, then 182 |
| Intermediate (up to 120) | 1, 2, 3, 4, 6, 9, 13, 19, 28, 42, 62, 95, 140, then 182 |
| Advanced (above 120) | 1, 1, 2, 3, 5, 7, 10, 15, 22, 33, 50, 80, 125, then 182 |

Entries are ordered by their date, not by when they were entered. A learned dance without entries is
due immediately. The order is the time since the last practice relative to its interval; never
practiced dances come first. Change `REVIEW_INTERVAL_TIERS` to tune it.

On the client, `client/src/features/practice/` adds the tabs "Practice" and "Practice log" to the
Personal page. The Practice tab is the flash card box: each due dance is a `FlipCard`
(`shared/ui/FlipCard.tsx`, generic front/back component) with the unchanged `ChoreographyCard` on the
front and `PracticeCardBack` on the back (music, restarts and tags, last practice, count, next due
date, date, note, "Sure" and "Unsure"). "Log practice" is the quick capture for several dances.
Dances that are not due yet are folded away behind a button.
