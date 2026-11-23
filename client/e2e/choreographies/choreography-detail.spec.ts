import { expect, test } from "@playwright/test";

import { API_BASE, createChoreographyViaApi } from "../helpers/api";

test.describe("Choreography Detail", () => {
  test("shows backend field issues and saves after correcting them", async ({ page }) => {
    const name = `E2E Validation ${Date.now()}`;
    await page.goto("/choreographies/new");
    await page.getByLabel("Choreography Name *").fill(name);
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/choreographies/validate") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Save Choreography" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    expect((await response.json()).issues).toContainEqual({ field: "level", key: "required" });
    const level = page.getByLabel("Official Level *");
    await expect(level).toHaveAttribute("aria-invalid", "true");
    await expect(level).toHaveCSS("border-color", "rgb(198, 61, 47)");
    await expect(page.getByText("Select a level.")).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Basic Information, validation errors" }),
    ).toBeVisible();

    await level.selectOption({ label: "BEGINNER" });
    await expect(level).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Select a level.")).toBeHidden();
    await page.getByRole("button", { name: "Save Choreography" }).click();
    await expect(page).toHaveURL("/");
  });

  test("supports edit action", async ({ page, request }) => {
    const originalName = `E2E Detail ${Date.now()}`;
    const updatedName = `${originalName} Updated`;
    const choreographyId = await createChoreographyViaApi(request, originalName);

    await page.goto(`/choreographies/${choreographyId}`);
    await expect(page.getByText(originalName)).toBeVisible();

    await page.getByRole("link", { name: /^Edit$/i }).click();
    await page.getByLabel(/Choreography Name/i).fill(updatedName);
    await page.getByRole("button", { name: /Save Choreography/i }).click();

    await expect(page.getByText(updatedName)).toBeVisible();
  });

  test("sets a personal level that the level filter respects", async ({ page, request }) => {
    const name = `E2E Personal Level ${Date.now()}`;
    const choreographyId = await createChoreographyViaApi(request, name);

    await page.goto(`/choreographies/${choreographyId}?edit=1`);
    const editor = page.getByLabel("Personal Level");
    await expect(editor.locator("option").first()).toHaveText("Same as official (BEGINNER)");
    await expect(editor.getByRole("option", { name: "ADVANCED", exact: true })).toHaveCount(1);
    await editor.selectOption({ label: "ADVANCED" });
    await page.getByRole("button", { name: /Save Choreography/i }).click();
    await expect(page.locator(".level-badge", { hasText: "ADVANCED" })).toBeVisible();

    await page.goto("/");
    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByRole("button", { name: /Advanced Filters/i }).click();
    await page.getByRole("radio", { name: /Up to max level/i }).check();
    await page.locator("#max-level-select").selectOption({ label: "BEGINNER" });
    await page.getByRole("button", { name: /Apply Filters/i }).click();
    await expect(page.locator(".choreography-card", { hasText: name })).toHaveCount(0);

    await page.getByRole("checkbox", { name: /Use official level/i }).check();
    await page.getByRole("button", { name: /Apply Filters/i }).click();
    await expect(page.locator(".choreography-card", { hasText: name })).toBeVisible();
  });

  test("saves songs from the songs tab and shows the favorite with its alternatives", async ({
    page,
    request,
  }) => {
    const name = `E2E Songs ${Date.now()}`;
    await page.goto("/choreographies/new");
    await page.getByLabel("Choreography Name *").fill(name);
    await page.getByLabel("Official Level *").selectOption({ label: "BEGINNER" });

    await page.getByRole("tab", { name: "Songs" }).click();
    await page.getByLabel("Title 1").fill("Main Song");
    await page.getByLabel("Artist 1").fill("Main Artist");
    await expect(page.getByRole("radio")).toHaveCount(0);
    await page.getByLabel("Title 2").fill("Alternative Song");
    await page.getByLabel("YouTube link 2 (optional)").fill("https://youtu.be/alternative");
    await page.getByRole("radio", { name: /Favorite song 2/ }).check();
    await page.getByRole("button", { name: "Save Choreography" }).click();
    await expect(page).toHaveURL("/");

    const search = await request.get(`${API_BASE}/choreographies/search`, {
      params: { search: name },
    });
    const [{ id }] = (await search.json()).data;
    await page.goto(`/choreographies/${id}`);
    await expect(page.locator(".music-section .song-name").first()).toHaveText("Alternative Song");
    await expect(page.locator(".alternative-songs")).toContainText("Main Artist - Main Song");
  });

  test("supports delete action", async ({ page, request }) => {
    const name = `E2E Delete ${Date.now()}`;
    const choreographyId = await createChoreographyViaApi(request, name);

    await page.goto(`/choreographies/${choreographyId}`);
    await expect(page.getByText(name)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.getByRole("button", { name: /^Delete choreography$/i }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByPlaceholder(/Search choreographies by name/i).fill(name);
    await page.getByPlaceholder(/Search choreographies by name/i).press("Enter");
    await expect(page.locator(".choreography-card", { hasText: name })).toHaveCount(0);
  });
});
