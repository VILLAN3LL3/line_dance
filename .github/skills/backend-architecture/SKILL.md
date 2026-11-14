---
name: backend-architecture
description: Apply the line_dance backend architecture and Flow Design when planning, implementing, reviewing, or testing backend features, fixes, refactors, API routes, persistence, or integrations.
---

# Backend architecture and Flow Design

Use this skill for every backend change, including small fixes. Inspect the affected feature and its
existing tests first; preserve established behavior unless a change is explicitly requested. Apply
the planning and verification workflows in the project instructions where applicable.

## Responsibilities and dependencies

The backend is a modular monolith assembled by `server/app.js`; routes are registered under
`server/routes/` and feature code lives under `server/features/`. Organize code around a feature and
its responsibilities, not around arbitrary file-size targets:

1. **HTTP adapters** extract request data, call a flow, and translate its results into the existing
   status codes and response bodies. They handle transport errors using the existing error helpers.
   Do not put SQL, external requests, business validation, or workflow orchestration in a route.
2. **Flows (integration functions)** coordinate operations and side effects: validation, repository
   calls, gateways, branching, and transaction boundaries. They do not depend on Express or return
   HTTP status codes. Pass ordinary data and return explicit application results or errors.
3. **Operations and validators** express focused, deterministic business rules and transformations.
   They do not access the database, network, filesystem, Express, repositories, flows, or gateways.
   Validation that needs stored data belongs in the flow, using a repository; keep input-only rules
   in pure validators. Do not duplicate backend validation rules in the frontend.
4. **Repositories and gateways** encapsulate side effects and infrastructure details. Repositories
   own SQL, including query construction; HTTP gateways own external requests. Use parameters for
   SQL values. Keep domain decisions in operations or flows, not embedded in transport handlers or
   persistence code.

An integration function composes operations and side-effecting calls; an operation does the actual
rule or transformation without orchestration or side effects. A function named `updateTrainer`,
for example, must not combine field validation, SQL, and Express response handling. Use only the
layers a feature needs, and reuse existing helpers rather than introducing unnecessary wrappers.
The course PDF renderer is a transport-specific exception: it writes the prepared document to the
response; its data preparation remains in the feature flow.

Examples to inspect: `server/routes/trainers.js` and `server/features/trainers/`,
`server/features/choreographies/` (including `search-query.js`), and
`server/features/url-check/`. `server/eslint.config.js` enforces some boundaries, but its route
list and import restrictions are not a complete architectural proof. Extend relevant restrictions
when adding an adapter or boundary, and review responsibilities manually as well.

## Persistence, errors, and contracts

- Preserve existing endpoint status codes, response shapes, validation issue keys and ordering,
  default values, and error precedence. Choreography field issues use `{ field, key }`; the
  frontend maps keys to display text rather than reimplementing rules.
- Use `withTransaction()` through the relevant repository for multi-step writes that must be
  atomic. Keep related writes and cleanup in the same transaction, and recheck mutable
  prerequisites inside it when needed. Throw unexpected failures so rollback occurs; returning
  an error result does not itself roll back earlier writes.
- Transactions and queries are serialized per SQLite connection. Nested transactions on the same
  connection are rejected. `personal_data` is attached to the choreography connection; the
  choreography and dance-group connections cannot be assumed to share a transaction or snapshot.
- Translate only known, narrowly identified persistence errors into application outcomes; propagate
  unexpected errors. Preserve the existing route error helpers and database-restart propagation.
  Do not hide failures behind success-shaped defaults.
- Preserve existing external-service behavior and security checks when extracting gateways.
  `server/features/url-check/` is the current implementation, not a general-purpose SSRF policy;
  review security requirements separately before adding new outbound-request use cases.

## Tests and change checklist

- Add unit tests for changed or new operations and validators, including meaningful edge cases.
- Add integration tests for changed or new integration functions, exercising their actual
  composition and relevant persistence or gateway boundary. Test transaction rollback on failure
  and concurrency where relevant; do not rely solely on mocked orchestration or API tests.
- Add or update API tests for HTTP behavior and contracts, including validation and errors. Use
  the shared app and existing test database setup in `server/tests/setup/`; include separate
  database coverage when cross-connection behavior matters.
- Check that each function has one kind of responsibility, dependencies point in the intended
  direction, and no new route bypasses its flow. Verify existing API behavior and transaction
  semantics, run the relevant tests and lint, and update the README if the architecture or public
  behavior changes.
