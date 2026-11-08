# E2E Testing with Docker

Run end-to-end tests in isolated Docker containers with all dependencies pre-installed.

## Quick Start

```bash
# Run all E2E tests in Docker
docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit

# Or with automatic cleanup after tests finish
docker-compose -f docker-compose.e2e.yml up --abort-on-container-exit --remove-orphans
```

## What it includes

- **Server container**: Node.js API server with all dependencies
- **Client container**: Vite dev server with built app
- **E2E container**: Playwright with Chromium pre-installed

## View test results

Test results are saved to `client/playwright-results/`:

```bash
# After tests complete, view the HTML report
open client/playwright-results/index.html
```

## Run specific tests

```bash
docker-compose -f docker-compose.e2e.yml run e2e npm run test:e2e -- choreography-search.spec.ts
```

## Clean up

```bash
docker-compose -f docker-compose.e2e.yml down
docker system prune -f  # Remove unused images
```

## Benefits over local setup

✅ No need to install Playwright locally
✅ Chromium + dependencies pre-installed
✅ Consistent environment (no OS differences)
✅ Easy CI/CD integration
✅ Clean isolation between runs
✅ Works on any machine with Docker
