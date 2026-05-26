---
name: plan-code-changes
description: "Plan code changes following best practices: clean code principles, test coverage, UX/UI consistency, component reusage, modularization, and documentation. Use when: starting a new feature or task to ensure architecture is sound before implementation. Reviews requirements, designs components, plans tests, and identifies documentation updates."
---

# Plan Code Changes

A structured workflow to design and plan code changes before implementation, ensuring adherence to clean code principles, maintainability, test coverage, and user experience best practices.

## When to Use

Invoke this skill when **starting a new feature, refactor, or significant task** to:
- ✅ Clarify requirements and acceptance criteria
- ✅ Design components with reusability in mind
- ✅ Plan test coverage strategy
- ✅ Ensure consistent UX/UI design
- ✅ Identify modularization opportunities
- ✅ Plan documentation and README updates
- ✅ Avoid rework and technical debt

## Planning Steps

### Step 1: Understand the Requirement
Clarify what needs to be built:
```
Questions to answer:
- What is the feature/change supposed to do?
- Who are the users and what's their workflow?
- What are the acceptance criteria?
- Are there edge cases or error scenarios?
- Does this interact with existing features?
```

**Output**: A clear, written requirement with examples and edge cases documented.

---

### Step 2: Design Architecture & Components
Plan the code structure for clean, reusable components:

#### React/TypeScript Components (Frontend)
```
Guidelines:
- Single Responsibility Principle: Each component has one reason to change
- Naming: Use descriptive PascalCase names (e.g., ChoreographyCard, RatingPill)
- Props: Keep props shallow; group related props into interfaces
- Composition: Favor composition over inheritance; use slots/children
- Hooks: Extract custom hooks for reusable logic (useRating, useSearch, etc.)
- Accessibility: Include aria-labels, semantic HTML, keyboard support
```

**Example**: For a star rating feature:
- `StarRating.tsx` (reusable 5-star component, read-only + interactive modes)
- `CompactRatingPill.tsx` (specialized container with expand/collapse behavior)
- Custom hook: `useChoreographyRating()` (handles API calls, optimistic updates)

#### Node.js/Express Routes (Backend)
```
Guidelines:
- Route handlers: One handler per logical operation
- Middleware: Extract auth, validation, logging into middleware
- Error handling: Consistent error response format
- Database: Use migrations, never hardcode schema changes
- API contracts: Document request/response shapes in types
```

**Example**: Rating endpoints:
- `PUT /api/choreographies/:id/rating` — Set rating
- `DELETE /api/choreographies/:id/rating` — Clear rating
- Handler functions: `rateChoreography()`, `deleteChoreographyRating()`

#### Modularization
```
File Structure:
client/src/
├── components/          # React components
│   ├── shared/         # Reusable across app
│   │   └── StarRating.tsx
│   └── choreographies/  # Feature-specific
│       └── ChoreographyCard.tsx
├── hooks/              # Custom React hooks
│   └── useChoreographyRating.ts
├── api.ts              # API client functions
└── types.ts            # Shared TypeScript types

server/
├── routes/             # Express route handlers
│   └── choreographies.js
├── migrations/         # Database schema changes
└── utils/              # Helper functions
```

---

### Step 3: Plan Test Coverage
Ensure comprehensive testing at all levels:

#### Unit Tests (Client & Server)
```
What to test:
- Pure functions (utilities, formatters, validators)
- Component props and state changes
- Hook behavior with different inputs
- API response handling and error cases

Examples:
✅ courseStatus.test.ts — Pure function utilities
✅ choreographyClipboard.test.ts — Clipboard formatting
✅ choreographies.test.js — Route handlers, DB queries
```

#### Component Tests (Client)
```
What to test:
- Component renders with correct props
- User interactions (clicks, input changes)
- Accessibility attributes present
- Conditional rendering logic
- Error and loading states

Examples:
✅ ChoreographyCard.test.tsx — Card rendering, interactions
✅ StarRating — Both read-only and interactive modes
```

#### E2E Tests (Client)
```
What to test:
- Full user workflows across multiple pages
- API integration from UI perspective
- Data persistence and updates
- Navigation and routing

Examples:
✅ choreography-detail.spec.ts — View, edit, delete flow
✅ choreography-search.spec.ts — Search, filter, pagination
✅ saved-filter-configurations.spec.ts — Create, save, load filters
```

#### Test Coverage Goals
- **Unit tests**: Aim for >80% coverage on core logic
- **Component tests**: Critical user paths, accessibility
- **E2E tests**: Happy paths + key error scenarios
- **Server routes**: 100% coverage for API endpoints

---

### Step 4: Design UX/UI Consistency
Ensure the feature fits seamlessly into the existing app:

#### Design System Alignment
```
Use existing patterns:
- Colors: var(--color-primary), var(--color-text-muted), etc.
- Spacing: Consistent gap/padding scales (4px, 6px, 10px, 12px, etc.)
- Typography: Reuse heading, body, label styles
- Borders & shadows: Use CSS variables (var(--shadow), var(--radius-md))
- Animations: Smooth transitions (0.15s-0.3s ease)
```

#### Accessibility (a11y)
```
Requirements:
- ✅ Semantic HTML (buttons, labels, lists, etc.)
- ✅ ARIA labels for interactive elements
- ✅ Keyboard navigation support (Tab, Enter, Escape)
- ✅ Color contrast ratios (WCAG AA minimum)
- ✅ Focus indicators visible
- ✅ No role="button" on non-button elements (use <button>)
- ✅ Meaningful alt text or aria-hidden for decorative elements

Examples:
✅ ChoreographyCard: aria-label on action buttons
✅ StarRating: aria-label="Rate X stars", keyboard support
✅ SearchBar: <label> associated with <input> fields
```

#### Visual Consistency
```
Check existing styles:
- Level badges: Consistent color scheme (blue for Beginner, green for Improver, etc.)
- Cards: Same border radius, shadow, padding as other cards
- Forms: Input styling matches existing form fields
- Buttons: Action buttons match existing button styles
- Spacing: Align with card header/content/footer padding patterns

Example: Rating pill in level badge
- Border color = level badge text color
- Icon color = level badge text color  
- Number color = matches text styling
```

---

### Step 5: Identify Component Reusage Opportunities
Design for reusability to reduce code duplication:

```
Ask:
- Can this component be used in multiple places?
- Are there variations (read-only, compact, full)?
- Can props make it flexible without adding complexity?
- Should this be a custom hook instead of a component?

Example: StarRating Component
- Used in: ChoreographyCard, SearchBar filter, ChoreographyDetail
- Variations: read-only mode, compact pill mode, interactive mode
- Props: rating, onChange, compact, readOnly
- Custom hook: useChoreographyRating() for rating API logic
```

---

### Step 6: Plan Documentation & README Updates
Identify what needs to be documented:

#### When to Update README.md
- [ ] New major feature or workflow
- [ ] Changes to API endpoints (new routes, parameter changes)
- [ ] New database schema or migration
- [ ] Setup instructions change
- [ ] Breaking changes to existing functionality
- [ ] New development practices or conventions

#### What to Document
```
API Features:
- Endpoint: /api/choreographies/:id/rating
- Method: PUT, DELETE
- Request/Response format
- Error codes and handling

Frontend Features:
- Component: StarRating
- Props and their types
- Usage examples
- Accessibility features

Setup & Development:
- Database schema changes
- New dependencies added
- Environment variables needed
- Migration steps for developers
```

#### Documentation Template
```markdown
## Feature Name

### Overview
Brief description of what was added/changed.

### API Endpoints
- `PUT /api/choreographies/:id/rating` - Set choreography rating
- `DELETE /api/choreographies/:id/rating` - Clear rating

### Components
- `StarRating.tsx` - Reusable 5-star rating widget
  - Props: `rating`, `onChange`, `compact`, `readOnly`
  - Usage: [example code]

### Database
- Added: `personal_data.choreography_ratings` table
- Migration: `008_add_choreography_ratings`

### Testing
- Unit: `ratings.test.js` (17 tests)
- E2E: `choreography-detail.spec.ts`
```

---

## Pre-Implementation Checklist

Before writing code, confirm:

- [ ] **Requirement** is clear with acceptance criteria
- [ ] **Component structure** planned (what goes where)
- [ ] **Reusability** identified (shared vs. feature-specific)
- [ ] **Test strategy** defined (unit, component, e2e)
- [ ] **Type definitions** planned (TypeScript interfaces)
- [ ] **API contracts** designed (request/response shapes)
- [ ] **Database schema** planned (if needed)
- [ ] **UX/UI** aligns with existing design system
- [ ] **Accessibility** requirements noted
- [ ] **Documentation** scope identified (README updates, code comments)
- [ ] **No duplication**: Similar features reviewed for patterns

---

## Clean Code Principles Applied

### Naming
- Use searchable, intention-revealing names
- Avoid cryptic abbreviations (use `choreographyId` not `chorId`)
- Component names describe purpose (use `CompactRatingPill` not `RatingWidget`)

### Functions & Methods
- Single Responsibility: One reason to change
- Keep functions small and focused
- Max 2-3 levels of nesting
- No side effects in pure functions

### Comments & Documentation
- Code should be self-documenting
- Comments explain *why*, not *what*
- JSDoc for public APIs and hooks
- Type annotations replace many comments

### Error Handling
- Handle errors explicitly
- Return meaningful error messages
- Fail fast; don't hide problems
- Test error paths, not just happy paths

### Modularity
- Small, focused files (<300 lines)
- Clear dependencies (imports at top)
- Avoid circular dependencies
- Extract reusable utilities

---

## Quick Reference: Before & After

| Concern | Before | After |
|---------|--------|-------|
| Component reuse | Duplicated star rating code in 3 places | Single `StarRating` component, 3 variations |
| Test coverage | Only happy path tested | Happy + error cases, accessibility tested |
| UX consistency | Level badge color, star color, padding all different | All use design system variables |
| Documentation | Undocumented API change | README updated with new endpoint, migration notes |
| Accessibility | No aria-labels, role="button" on divs | Semantic HTML, aria-labels, keyboard support |
| Maintainability | Custom hooks scattered | Custom hooks in `hooks/` folder with docs |

---

## Success Criteria

✅ **Planning complete when:**
- Requirement is unambiguous
- Component architecture is clear
- Tests are planned (unit, component, e2e)
- UX/UI aligns with design system
- Reusability opportunities identified
- Documentation needs identified
- No significant unknowns remain
- Ready to implement with confidence

🚀 **Next Step**: Use `/verify-code-changes` skill after implementation to ensure quality gates pass.
