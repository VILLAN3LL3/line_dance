# GitHub Copilot Instructions for line_dance

## Skill-Driven Workflow

For **any new feature, refactor, or substantial code change request**, automatically follow this workflow:

### 1. Plan Phase (Always)
Start by invoking the `/plan-code-changes` skill to:
- Clarify requirements and acceptance criteria
- Design component architecture
- Plan test coverage
- Ensure UX/UI consistency
- Identify reusability opportunities
- Plan documentation updates

After planning, confirm with the user: _"Planning complete. Ready to implement?"_

### 2. Implementation Phase
Execute the planned changes:
- Write code following the planned architecture
- Implement components, tests, and API changes as designed
- **After every file edit: use `get_errors` to check the VS Code Problems tab for compile errors and lint warnings before moving on**
- Add/update tests incrementally
- Update documentation (README, comments, JSDoc)

### 3. Verification Phase (Always)
After implementation, invoke the `/verify-code-changes` skill to:
- Run linting on both client and server
- Run type checking
- Run unit tests (client and server)
- Run e2e tests
- Format code with Prettier
- Run security checks
- Fix any issues that arise

Report results: _"All verifications passed" or "Fixed X issues, re-run verification."_

## When to Use Each Skill

| Request Type | Use Skills? | Workflow |
|--------------|-----------|----------|
| "Add a new feature..." | ✅ Yes | Plan → Implement → Verify |
| "Refactor X component..." | ✅ Yes | Plan → Implement → Verify |
| "Fix a bug in X..." | ⚠️ Maybe | Quick fix: go straight to verify. Complex fix: plan first. |
| "Create a new page..." | ✅ Yes | Plan → Implement → Verify |
| "Update this one line..." | ❌ No | Just fix and verify |
| "Implement the specification..." | ✅ Yes | Plan → Implement → Verify |

## Exceptions & Flexibility

- **Quick fixes** (single line, obvious bug): Skip planning, go straight to verify
- **User says "no planning"**: Respect that and skip to implementation
- **Complex dependencies**: Ask for planning even if it seems small
- **If planning takes too long**: Summarize key decisions and get user sign-off to proceed

## Default Behavior

- **Assume**: Every request needs planning unless it's trivial or the user explicitly says otherwise
- **Ask**: If unclear whether planning is needed, ask the user
- **Communicate**: Explain the workflow at the start: _"I'll start by planning this feature..."_
- **Confirm**: After each phase, confirm readiness to proceed to the next

## Code Quality Standards

All code changes must pass:
- ✅ ESLint with zero warnings (`--max-warnings=0`)
- ✅ TypeScript type checking
- ✅ All test suites (client, server, e2e)
- ✅ Prettier formatting
- ✅ Security checks (npm audit)
- ✅ Accessibility standards (a11y)
- ✅ Clean code principles (reusability, modularity, naming, documentation)

No commits without passing verification.

## Design System & Consistency

When implementing features:
- Use CSS variables for colors: `var(--color-primary)`, `var(--color-text-muted)`, etc.
- Use consistent spacing: multiples of 4px or 6px (4, 6, 10, 12, 16, 20, etc.)
- Follow existing component patterns (cards, badges, buttons, forms)
- Ensure accessibility: semantic HTML, aria-labels, keyboard support
- Match existing UX patterns and workflows

## Documentation

Always update docs when:
- Adding new API endpoints
- Changing database schema
- Creating new components
- Modifying user-facing features
- Changing setup/installation steps

Update `README.md` or add code comments explaining *why*, not *what*.

---

**This workflow ensures code quality, consistency, and maintainability across the line_dance project.**
