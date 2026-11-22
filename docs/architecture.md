# Architecture Overview

## Backend

The Express application is assembled in `server/app.ts`; `server/scripts/server.ts` initializes the
databases and migrations, starts the listener, and handles shutdown. Production and API tests use the
same app and route registrations. Choreography and dance-group HTTP routes are registered in their
respective router modules under `server/routes/`.

Backend features live under `server/features/`. Pure operations normalize, validate, and transform
data without database or HTTP dependencies; flows coordinate operations, persistence, external
services, and transactions; repositories own SQLite queries; and route handlers translate flow
results into HTTP responses. The URL checker uses an HTTP gateway, and the PDF renderer writes the
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
and updates, rating and personal level updates, level creation, saved-filter and step-figure writes, session creation,
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
author statistics. Editing a choreography always works on `official_level`.

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
