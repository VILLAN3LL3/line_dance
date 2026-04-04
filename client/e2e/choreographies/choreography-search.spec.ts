import { APIRequestContext, expect, test } from "@playwright/test";

import { API_BASE, createChoreographyViaApi } from "../helpers/api";

test.describe("Choreography Search", () => {
  test("create, filter, and open a choreography", async ({ page }) => {
    const name = `E2E Choreo ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: /Add New Choreography/i }).click();

    await expect(page.getByRole("heading", { name: /Add New Choreography/i })).toBeVisible();

    await page.getByLabel(/Choreography Name/i).fill(name);
    await page.getByLabel(/Level/i).selectOption({ label: "Beginner" });
    await page.getByPlaceholder("e.g., 64").fill("32");
    await page.getByPlaceholder("e.g., 4").fill("4");

    await page.getByPlaceholder("Author name").fill("E2E Author");
    await page.getByRole("button", { name: /Add Author/i }).click();

    await page.getByPlaceholder(/Step figure name/i).fill("Vine");
    await page.getByRole("button", { name: /Add Figure/i }).click();

    await page.getByPlaceholder(/Tag \(e\.g\., Country, Western, Urban\)/i).fill("E2E");
    await page.getByRole("button", { name: /Add Tag/i }).click();

    await page.getByRole("button", { name: /Save Choreography/i }).click();
    await expect(page.getByRole("heading", { name: /Choreography Search/i })).toBeVisible();
    await expect(page.getByText(/Failed to create choreography/i)).toHaveCount(0);

    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");

    const resultCard = page.locator(".choreography-card", { hasText: name }).first();
    await expect(resultCard).toBeVisible({ timeout: 30_000 });

    await resultCard.getByRole("button", { name: /^Open$/i }).click();
    await expect(page.getByRole("button", { name: /Back to List/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// API-level regression: bracket-notation array params reach the server correctly
// ---------------------------------------------------------------------------
// These tests call the backend API directly with raw bracket-notation query
// strings (level[]=, step_figures[]= ) — the same format the frontend sends.
// They would have caught the Express 5 query-parser regression immediately.

test.describe("Choreography Search API — bracket-notation array params", () => {
  test("level[]= filters return only matching levels", async ({ request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const beginnerName = `_E2E Beginner Dance ${runId}`;
    const intermediateName = `_E2E Intermediate Dance ${runId}`;

    // Seed: one Beginner, one Intermediate
    await ensureLevel(request, "Intermediate");
    await createChoreographyViaApi(request, beginnerName);
    const intermediateRes = await request.post(`${API_BASE}/choreographies`, {
      data: { name: intermediateName, level: "Intermediate", step_figures: ["Pivot"], count: 48 },
    });
    expect(intermediateRes.ok()).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/choreographies/search?level[]=Beginner&level[]=Intermediate&search=${encodeURIComponent(runId)}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const names: string[] = body.data
      .map((c: { name: string }) => c.name)
      .sort((a: string, b: string) => a.localeCompare(b));
    expect(names).toEqual(
      [beginnerName, intermediateName].sort((a: string, b: string) => a.localeCompare(b)),
    );
  });

  test("step_figures[]= with exact mode returns only subset-matching choreos", async ({
    request,
  }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const vineOnlyName = `_E2E Vine Only ${runId}`;
    const vinePivotName = `_E2E Vine Pivot ${runId}`;

    // Seed: Vine only; Vine + Pivot
    await request.post(`${API_BASE}/choreographies`, {
      data: { name: vineOnlyName, level: "Beginner", step_figures: ["Vine"], count: 32 },
    });
    await request.post(`${API_BASE}/choreographies`, {
      data: { name: vinePivotName, level: "Beginner", step_figures: ["Vine", "Pivot"], count: 32 },
    });

    // Exact mode with [Vine, Pivot] — "Vine Only" has Pivot not in its figures → excluded
    // Wait, exact mode means ALL choreo figures must be IN the selection.
    // "Vine Only" has {Vine} ⊆ {Vine, Pivot} ✓
    // "Vine Pivot" has {Vine, Pivot} ⊆ {Vine, Pivot} ✓
    // Both should match. Use [Vine] only to exclude "Vine Pivot".
    const res = await request.get(
      `${API_BASE}/choreographies/search?step_figures[]=Vine&step_figures_match_mode=exact&search=${encodeURIComponent(runId)}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const names: string[] = body.data.map((c: { name: string }) => c.name);
    expect(names).toContain(vineOnlyName);
    expect(names).not.toContain(vinePivotName);
  });

  test("combined level[]= and step_figures[]= filters work together", async ({ request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const beginnerName = `_E2E B Vine ${runId}`;
    const intermediateName = `_E2E I Vine ${runId}`;

    await ensureLevel(request, "Intermediate");
    await request.post(`${API_BASE}/choreographies`, {
      data: { name: beginnerName, level: "Beginner", step_figures: ["Vine"], count: 32 },
    });
    await request.post(`${API_BASE}/choreographies`, {
      data: { name: intermediateName, level: "Intermediate", step_figures: ["Vine"], count: 32 },
    });

    const res = await request.get(
      `${API_BASE}/choreographies/search?level[]=Beginner&step_figures[]=Vine&step_figures_match_mode=any&search=${encodeURIComponent(runId)}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const names: string[] = body.data.map((c: { name: string }) => c.name);
    expect(names).toContain(beginnerName);
    expect(names).not.toContain(intermediateName);
  });
});

async function ensureLevel(request: APIRequestContext, name: string) {
  const levelsResponse = await request.get(`${API_BASE}/levels`);
  expect(levelsResponse.ok()).toBeTruthy();

  const levels: Array<{ name: string }> = await levelsResponse.json();
  if (levels.some((level) => level.name === name)) {
    return;
  }

  const createResponse = await request.post(`${API_BASE}/levels`, {
    data: { name },
  });

  expect(createResponse.status()).toBe(201);
}
