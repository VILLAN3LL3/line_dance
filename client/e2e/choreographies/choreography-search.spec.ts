import { APIRequestContext, expect, test } from "@playwright/test";

import { API_BASE, createChoreographyViaApi } from "../helpers/api";

test.describe("Choreography Search", () => {
  test("create, filter, and edit a choreography", async ({ page }) => {
    const name = `E2E Choreo ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: /Add New Choreography/i }).click();
    await expect(page).toHaveURL(/\/choreographies\/new$/);

    await expect(page.getByRole("heading", { name: /Add New Choreography/i })).toBeVisible();

    await page.getByLabel(/Choreography Name/i).fill(name);
    await page.getByLabel(/Level/i).selectOption({ label: "BEGINNER" });
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

    await resultCard.getByRole("link", { name: /^Edit$/i }).click();
    await expect(page.getByRole("button", { name: /Save Choreography/i })).toBeVisible();
    await expect(page.getByLabel(/Choreography Name/i)).toHaveValue(name);
  });

  test("persists display mode and filters after reload", async ({ page, request }) => {
    const runId = `persist-${Date.now()}`;
    await createChoreographyViaApi(request, `Persisted ${runId}`);

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(runId);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();

    await page.getByRole("combobox", { name: "Level:" }).fill("BEGINNER");
    await page.getByRole("combobox", { name: "Level:" }).press("Enter");
    await page.getByRole("button", { name: /Apply Filters/i }).click();

    await page.getByRole("button", { name: /^Table$/i }).click();
    await expect(page.locator(".choreography-table")).toBeVisible();

    await page.reload();

    await expect(page.getByPlaceholder(/Search choreographies by name/i)).toHaveValue(runId);
    await expect(page.getByRole("button", { name: /^Table$/i })).toHaveClass(/active/);

    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await expect(page.locator(".filter-tag", { hasText: "BEGINNER" })).toBeVisible();
  });

  test("filters choreographies by max level mode", async ({ page, request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const beginnerName = `Beginner ${runId}`;
    const intermediateName = `Intermediate ${runId}`;
    const advancedName = `Advanced ${runId}`;

    await createChoreographyWithPayload(request, {
      name: beginnerName,
      count: 32,
      level: "BEGINNER",
      step_figures: ["Vine"],
    });
    await createChoreographyWithPayload(request, {
      name: intermediateName,
      count: 40,
      level: "INTERMEDIATE",
      step_figures: ["Pivot"],
    });
    await createChoreographyWithPayload(request, {
      name: advancedName,
      count: 48,
      level: "ADVANCED",
      step_figures: ["Kick"],
    });

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(runId);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("radio", { name: /Up to max level/i }).check();
    await page.getByRole("combobox", { name: "Level:" }).selectOption({ label: "INTERMEDIATE" });
    await page.getByRole("button", { name: /Apply Filters/i }).click();

    await expect(page.locator(".choreography-card", { hasText: beginnerName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: intermediateName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: advancedName })).toHaveCount(0);
  });

  test("excludes choreographies by tag", async ({ page, request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const includedName = `Exclude Tag Included ${runId}`;
    const excludedName = `Exclude Tag Blocked ${runId}`;

    await request.post(`${API_BASE}/choreographies`, {
      data: {
        name: includedName,
        level: "BEGINNER",
        authors: ["E2E API Author"],
        tags: ["E2E-KEEP"],
        step_figures: ["Vine"],
        count: 32,
        wall_count: 4,
      },
    });
    await request.post(`${API_BASE}/choreographies`, {
      data: {
        name: excludedName,
        level: "BEGINNER",
        authors: ["E2E API Author"],
        tags: ["E2E-BLOCK"],
        step_figures: ["Vine"],
        count: 32,
        wall_count: 4,
      },
    });

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(runId);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("radio", { name: /Exclude matches/i }).check();

    const tagsGroup = page.locator(".filter-group", { hasText: /^Tags:/ });
    await tagsGroup.getByRole("combobox", { name: "Tags:" }).fill("E2E-BLOCK");
    await tagsGroup.getByRole("combobox", { name: "Tags:" }).press("Enter");
    await page.getByRole("button", { name: /Apply Filters/i }).click();

    await expect(page.locator(".choreography-card", { hasText: includedName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: excludedName })).toHaveCount(0);
    await expect(page.locator(".filter-tag-exclude", { hasText: "E2E-BLOCK" })).toBeVisible();
  });

  test("supports table sorting and row click detail flow", async ({ page, request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const lowCountName = `A Low Count ${runId}`;
    const highCountName = `B High Count ${runId}`;

    await createChoreographyWithPayload(request, {
      name: lowCountName,
      count: 16,
      level: "BEGINNER",
      step_figures: ["Vine"],
    });
    await createChoreographyWithPayload(request, {
      name: highCountName,
      count: 64,
      level: "BEGINNER",
      step_figures: ["Vine"],
    });

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(runId);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");

    await page.getByRole("button", { name: /^Table$/i }).click();
    await expect(page.locator(".choreography-table")).toBeVisible();

    await page.locator("th.sortable", { hasText: /^Count/ }).click();
    const firstAsc = (await page.locator(".name-cell strong").first().textContent())?.trim();
    expect(firstAsc).toBe(lowCountName);

    await page.locator("th.sortable", { hasText: /^Count/ }).click();
    const firstDesc = (await page.locator(".name-cell strong").first().textContent())?.trim();
    expect(firstDesc).toBe(highCountName);

    await page.locator(".choreography-row").first().click();
    await expect(page.getByRole("button", { name: /Back to List/i })).toBeVisible();
    await expect(page.getByText(highCountName)).toBeVisible();
  });

  test("updates results when changing step-figure match mode in UI", async ({ page, request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const vineOnlyName = `Vine Only ${runId}`;
    const vinePivotName = `Vine Pivot ${runId}`;

    await createChoreographyWithPayload(request, {
      name: vineOnlyName,
      count: 32,
      level: "BEGINNER",
      step_figures: ["Vine"],
    });
    await createChoreographyWithPayload(request, {
      name: vinePivotName,
      count: 32,
      level: "BEGINNER",
      step_figures: ["Vine", "Pivot"],
    });

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(runId);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();

    const figuresGroup = page.locator(".filter-group", { hasText: /^Step Figures:/ });
    await figuresGroup.getByPlaceholder(/Add step figure/i).fill("Vine");
    await figuresGroup.getByRole("button", { name: /^\+$/ }).click();

    await page.getByRole("button", { name: /Apply Filters/i }).click();
    await expect(page.locator(".choreography-card", { hasText: vineOnlyName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: vinePivotName })).toBeVisible();

    await page.getByLabel(/EXACT \(only selected\)/i).check();
    await page.getByRole("button", { name: /Apply Filters/i }).click();
    await expect(page.locator(".choreography-card", { hasText: vineOnlyName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: vinePivotName })).toHaveCount(0);

    await page.getByLabel(/OR \(any selected\)/i).check();
    await page.getByRole("button", { name: /Apply Filters/i }).click();
    await expect(page.locator(".choreography-card", { hasText: vineOnlyName })).toBeVisible();
    await expect(page.locator(".choreography-card", { hasText: vinePivotName })).toBeVisible();
  });

  test("prevents submit when required fields are missing, then succeeds after completion", async ({
    page,
  }) => {
    const name = `E2E Required ${Date.now()}`;

    await page.goto("/");
    await page.getByRole("button", { name: /Add New Choreography/i }).click();
    await expect(page).toHaveURL(/\/choreographies\/new$/);
    await expect(page.getByRole("heading", { name: /Add New Choreography/i })).toBeVisible();

    await page.getByLabel(/Choreography Name/i).fill(name);
    await page.getByRole("button", { name: /Save Choreography/i }).click();

    await expect(page.getByRole("heading", { name: /Add New Choreography/i })).toBeVisible();
    await expect(page).toHaveURL(/\/choreographies\/new$/);

    await page.getByLabel(/Level/i).selectOption({ label: "BEGINNER" });
    await page.getByRole("button", { name: /Save Choreography/i }).click();

    await expect(page.getByRole("heading", { name: /Choreography Search/i })).toBeVisible();
    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");
    await expect(page.locator(".choreography-card", { hasText: name })).toBeVisible();
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

    // Seed: one BEGINNER, one INTERMEDIATE
    await createChoreographyViaApi(request, beginnerName);
    const intermediateRes = await request.post(`${API_BASE}/choreographies`, {
      data: { name: intermediateName, level: "INTERMEDIATE", step_figures: ["Pivot"], count: 48 },
    });
    expect(intermediateRes.ok()).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/choreographies/search?level[]=BEGINNER&level[]=INTERMEDIATE&search=${encodeURIComponent(runId)}`,
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
      data: { name: vineOnlyName, level: "BEGINNER", step_figures: ["Vine"], count: 32 },
    });
    await request.post(`${API_BASE}/choreographies`, {
      data: { name: vinePivotName, level: "BEGINNER", step_figures: ["Vine", "Pivot"], count: 32 },
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

    await request.post(`${API_BASE}/choreographies`, {
      data: { name: beginnerName, level: "BEGINNER", step_figures: ["Vine"], count: 32 },
    });
    await request.post(`${API_BASE}/choreographies`, {
      data: { name: intermediateName, level: "INTERMEDIATE", step_figures: ["Vine"], count: 32 },
    });

    const res = await request.get(
      `${API_BASE}/choreographies/search?level[]=BEGINNER&step_figures[]=Vine&step_figures_match_mode=any&search=${encodeURIComponent(runId)}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const names: string[] = body.data.map((c: { name: string }) => c.name);
    expect(names).toContain(beginnerName);
    expect(names).not.toContain(intermediateName);
  });

  test("max_level_value and excluded_tags[] filters work through the API", async ({ request }) => {
    const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const beginnerName = `_E2E Beginner Keep ${runId}`;
    const advancedName = `_E2E Advanced Block ${runId}`;

    await request.post(`${API_BASE}/choreographies`, {
      data: {
        name: beginnerName,
        level: "BEGINNER",
        authors: ["E2E API Author"],
        tags: ["E2E-KEEP"],
        step_figures: ["Vine"],
        count: 32,
        wall_count: 4,
      },
    });
    await request.post(`${API_BASE}/choreographies`, {
      data: {
        name: advancedName,
        level: "ADVANCED",
        authors: ["E2E API Author"],
        tags: ["E2E-BLOCK"],
        step_figures: ["Kick"],
        count: 56,
        wall_count: 4,
      },
    });

    const levelsRes = await request.get(`${API_BASE}/levels`);
    expect(levelsRes.ok()).toBeTruthy();
    const levels = (await levelsRes.json()) as Array<{ name: string; value: number }>;
    const beginnerLevel = levels.find((level) => level.name === "BEGINNER");
    expect(beginnerLevel).toBeDefined();

    const res = await request.get(
      `${API_BASE}/choreographies/search?max_level_value=${beginnerLevel?.value}&excluded_tags[]=E2E-BLOCK&search=${encodeURIComponent(runId)}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const names: string[] = body.data.map((c: { name: string }) => c.name);
    expect(names).toContain(beginnerName);
    expect(names).not.toContain(advancedName);
  });
});

async function createChoreographyWithPayload(
  request: APIRequestContext,
  data: { name: string; count: number; level: string; step_figures: string[] },
) {
  const response = await request.post(`${API_BASE}/choreographies`, {
    data: {
      name: data.name,
      level: data.level,
      authors: ["E2E API Author"],
      tags: ["E2E-API"],
      step_figures: data.step_figures,
      count: data.count,
      wall_count: 4,
    },
  });

  expect(response.ok()).toBeTruthy();
}
