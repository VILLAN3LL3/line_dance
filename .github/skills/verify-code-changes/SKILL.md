---
name: verify-code-changes
description: "Run comprehensive verification on code changes: lint, type check, test, build, and security scan. Use when: finished a todo/task and want to verify everything passes before commit. Runs linter, TypeScript compiler, test suite, builds both client and server, and security audits. Fixes issues and reformats code."
---

# Verify Code Changes

A multi-step workflow to ensure all code changes pass quality gates before committing.

## When to Use

Invoke this skill whenever you think you have finished a todo/task and want to verify that:
- ✅ Linting passes (ESLint)
- ✅ Type checking passes (TypeScript)
- ✅ Tests pass (Vitest)
- ✅ Build succeeds
- ✅ No security vulnerabilities (CVE scans)
- ✅ Code is properly formatted (Prettier)

## Verification Steps

### Step 1: Client-Side Verification
Verify the client (React + TypeScript) passes all checks:
```bash
cd client
npm run lint      # ESLint with --max-warnings=0
npm run build     # TypeScript compilation and Vite build
npm run test      # Vitest tests
```

**On lint failure**: Review error details in the problems tab. Common fixes:
- Unused variables or imports
- Missing `aria-label` attributes  
- Nested ternary operators (use intermediate variables)

**On build failure**: Check for TypeScript errors. Review the build output and fix type mismatches or missing fields.

**On test failure**: Run individual test files to isolate issues. Check test output for assertion failures or setup issues.

### Step 2: Server-Side Verification
Verify the server (Node.js + Express) passes all checks:
```bash
cd server
npm run lint      # ESLint with --max-warnings=0
npm run test      # Vitest tests
npm run build     # TypeScript compilation (if applicable)
```

**On lint failure**: Same as client — address unused variables, import issues, etc.

**On test failure**: Tests should pass (291 tests expected). If failures occur, check the test-specific error output.

### Step 3: E2E Tests
Verify end-to-end tests pass (Playwright):
```bash
cd client
npm run test:e2e   # Playwright e2e tests
```

**On e2e failure**: E2E tests validate full user workflows across the application. Check:
- Server is running (`npm run start` in server directory)
- Browser automation logs for specific failure reasons
- Whether the failure is flaky (rerun to confirm)

### Step 4: Format Code
Reformat code with Prettier to ensure consistency:
```bash
# Format client
cd client && npx prettier --write src/

# Format server  
cd server && npx prettier --write routes/ scripts/ utils/ migrations/
```

### Step 5: Security Check
Run CVE and vulnerability scans:
```bash
# For Node.js dependencies
npm audit

# For TypeScript/JavaScript specific vulnerabilities
# (Integrate with GitHub's Dependabot or similar for continuous monitoring)
```

## What to Do If Verification Fails

1. **Review the error**: Read the full error message in the problems tab or terminal output.
2. **Fix the issue**: Address the root cause (missing field, type mismatch, test assertion, etc.).
3. **Re-run verification**: Run this skill again to confirm the fix.
4. **Repeat until passing**: Continue until all steps pass.

## Expected Outcomes

✅ **All checks pass**: Safe to commit.  
❌ **Lint/type check fails**: Fix code quality issues before proceeding.  
❌ **Tests fail**: Debug test failures and fix the underlying code.  
❌ **E2E tests fail**: Rerun to confirm it's not flaky; check browser automation logs.  
❌ **Build fails**: Address TypeScript or compilation errors.  
❌ **Security issues found**: Upgrade or patch vulnerable packages.

## Quick Reference

| Check | Command | What It Does |
|-------|---------|--------------|
| Lint (client) | `cd client && npm run lint` | ESLint with zero warnings |
| Lint (server) | `cd server && npm run lint` | ESLint with zero warnings |
| Type check | Built into `npm run lint` and `npm run build` | TypeScript compilation |
| Test (client) | `cd client && npm run test` | Vitest suite |
| E2E tests | `cd client && npm run test:e2e` | Playwright e2e tests |
| Test (server) | `cd server && npm run test` | Vitest suite (291 tests) |
| Build (client) | `cd client && npm run build` | Vite + TypeScript compile |
| Format | `npx prettier --write <path>` | Code formatting |
| Security | `npm audit` | CVE scan |

---

**Success Criteria**: All steps complete without errors, problems tab is empty, ready for commit.
