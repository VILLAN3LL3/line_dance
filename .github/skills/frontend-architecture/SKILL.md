---
name: frontend-architecture
description: Apply the line_dance frontend architecture (feature modules with MVVM and Flow Design) when planning, implementing, reviewing, or testing client features, fixes, refactors, pages, hooks, or API access.
---

# Frontend architecture (MVVM + Flow Design)

Use this skill for every change under `client/src/`. Inspect the affected feature and its tests
first and preserve observable behavior unless a change is explicitly requested. Apply the planning
and verification workflows from the project instructions.

The frontend mirrors the backend (`backend-architecture` skill): React views are the adapters,
view model hooks are the flows, pure functions are the operations, and API modules are the
gateways. The reference implementation is `client/src/features/trainers/`.

## Layout

```
client/src/
  app/                    # router and app shell; imports features via index.ts (or pages.ts)
  features/<feature>/
    api.ts                # gateway: the only place that talks to the server for this feature
    queryKeys.ts          # TanStack Query keys
    model/                # pure operations + types (mappers, normalization, reducers, issue-key texts)
    viewmodels/           # use<Feature>ViewModel / use<Thing>Query: state + orchestration
    views/                # pages (route level) and presentational components
    index.ts              # public API of the feature (hooks, shared pages/components)
    pages.ts              # optional: route pages when exporting them from index.ts would create a cycle
  shared/
    http/                 # httpClient (axios), apiErrors helpers
    storage/              # typed localStorage gateway
    query/                # QueryClient defaults
    ui/                   # design-system building blocks
    browser/              # clipboard, history, window, download gateways
    utils/                # framework-free helpers shared across features
```

## Responsibilities and dependencies

`views -> viewmodels -> model` and `viewmodels -> api / shared/storage`; `api -> shared/http`.

1. **Views** render props and emit events. No gateway, storage, or `axios` access, no business
   rules. Page components call exactly one view model and compose smaller presentational
   components. UI-only concerns (e.g. `confirmAction`) stay in the view; the view model executes
   the confirmed intent.
2. **View models** (`use…ViewModel`) are hooks returning `{ state, actions }`. They own local UI
   state, call the feature `api.ts` through TanStack Query (`useQuery`/`useMutation`), use
   `shared/storage` for persistence, and delegate decisions to `model/`. Router hooks are allowed
   only in page-level view models. They never import views.
3. **Model** (`model/`) holds deterministic, framework-free functions and types: no React, router,
   axios, storage, or API imports. Prefer a pure reducer plus `useReducer` over many `useState`.
4. **Gateways** (`api.ts`, `shared/storage`) encapsulate I/O. Feature code uses `httpClient`
   from `shared/http`; `axios` is only used for error type checks inside `shared/http`.
5. **Features talk to each other only through `index.ts`.** Outside `features/`, ESLint blocks
   deeper imports (only `pages.ts` is allowed besides `index.ts`); between features this is a
   review rule. Avoid import cycles: `dance-groups` uses `courses`, so `courses` reads groups
   through `dance-groups/index.ts` (hooks only) while the group pages live in `pages.ts`.
6. `shared/` never imports from features.

Do not duplicate backend validation in the frontend. Map backend issue keys (`{ field, key }`) to
display text in `model/`; keep only UX conveniences (e.g. required-field pre-checks) that already
exist.

## Server state

Use TanStack Query for all server state: no hand-written `loading`/`error`/`useEffect` fetching and
no manual in-flight deduplication. Defaults live in `shared/query/queryClient.ts` (no retries, no
refetch on focus). Define keys in the feature's `queryKeys.ts`; mutations invalidate the affected
keys and return the invalidation promise so the UI stays busy until fresh data arrived.
Reusable queries (e.g. `useTrainersQuery`) are exported through `index.ts`.

## Conventions

- Files stay below ~300 lines and have a single responsibility (known exception:
  `courses/views/CourseDetailSessionsSection.tsx`, a props-only view); names are intention-revealing
  (`use<Feature>ViewModel`, `<Feature>Page`).
- Keep markup, class names, and accessibility attributes stable when refactoring; e2e tests rely
  on them.
- Browser APIs (`localStorage`, `history`, `window.open`, clipboard, downloads) are accessed
  through `shared/storage` and `shared/browser`, not in components.
- When passing a function reference to `mutationFn`, wrap it in a lambda: TanStack Query adds
  a context argument that would otherwise leak into the API call.
- ESLint (`client/eslint.config.ts`) enforces the layer boundaries; extend the rules when adding
  a layer, and still review responsibilities manually.

## Tests

Tests live in `client/src/__tests__/features/<feature>/`; shared code is tested in
`__tests__/shared/`.

- **model/**: pure unit tests without mocks, including edge cases.
- **view models**: `renderHook` with `createQueryWrapper()` from `__tests__/helpers/` and the
  feature `api` module mocked (`vi.mock("../../../features/<feature>/api")`); cover the happy
  path, error paths, loading, and cache invalidation.
- **views**: component tests with plain props and no API mocking; use `renderWithQueryClient`
  only for page components that call a view model.
- **e2e** (`client/e2e/`) stays unchanged as the behavior safety net.

## Checklist

- No component imports `api` or touches `localStorage`.
- Dependencies point in the intended direction; ESLint passes with `--max-warnings=0`.
- Behavior, markup, and accessibility are unchanged; tests for model, view model, and view exist.
- README architecture section updated when the structure changes.
